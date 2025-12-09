use std::fs;
use std::path::Path;
use std::io::copy;
use reqwest::Client;
use zip::ZipArchive;
use futures_util::StreamExt;
use std::cmp::min;
use std::io::Write;
use tauri::{Window, Emitter};

#[derive(Clone, serde::Serialize)]
struct ProgressPayload {
    game_id: String,
    game_name: String,
    progress: u64,
    status: String,
}

#[tauri::command]
pub async fn install_game(
    window: Window,
    download_url: String,
    install_path: String,
    folder_name: String,
    game_id: String,
    game_name: String,
) -> Result<String, String> {
    let client = Client::new();
    let game_dir = Path::new(&install_path).join("Ether").join(&folder_name);
    
    // Create directory
    fs::create_dir_all(&game_dir).map_err(|e| e.to_string())?;

    let zip_path = game_dir.join("game.zip");

    // 1. Download
    let res = client
        .get(&download_url)
        .header("User-Agent", "EtherLauncher/1.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let total_size = res.content_length().unwrap_or(0);
    let mut stream = res.bytes_stream();
    let mut file = fs::File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut downloaded: u64 = 0;

    let _ = window.emit("install:progress", ProgressPayload {
        game_id: game_id.clone(),
        game_name: game_name.clone(),
        progress: 0,
        status: "downloading".to_string(),
    });

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        if total_size > 0 {
            let percent = min(100, (downloaded * 100) / total_size);
            let _ = window.emit("install:progress", ProgressPayload {
                game_id: game_id.clone(),
                game_name: game_name.clone(),
                progress: percent,
                status: "downloading".to_string(),
            });
        }
    }

    // 2. Extract
    let _ = window.emit("install:progress", ProgressPayload {
        game_id: game_id.clone(),
        game_name: game_name.clone(),
        progress: 100,
        status: "extracting".to_string(),
    });

    let file = fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(path) => game_dir.join(path),
            None => continue,
        };

        if (*file.name()).ends_with('/') {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = fs::File::create(&outpath).map_err(|e| e.to_string())?;
            copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    // 3. Cleanup
    fs::remove_file(&zip_path).map_err(|e| e.to_string())?;

    // 4. Verify Manifest
    let manifest_path = game_dir.join("manifest.json");
    if !manifest_path.exists() {
        return Err("Invalid Game: manifest.json is missing at root.".to_string());
    }

    let _ = window.emit("install:complete", ProgressPayload {
        game_id: game_id.clone(),
        game_name: game_name.clone(),
        progress: 100,
        status: "complete".to_string(),
    });

    Ok(game_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn select_folder() -> Option<String> {
    let folder = rfd::AsyncFileDialog::new().pick_folder().await;
    folder.map(|f| f.path().to_string_lossy().to_string())
}

#[tauri::command]
pub fn uninstall_game(install_path: String, folder_name: String) -> Result<bool, String> {
    let game_dir = Path::new(&install_path).join("Ether").join(folder_name);
    if game_dir.exists() {
        fs::remove_dir_all(game_dir).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn is_game_installed(install_path: String, folder_name: String) -> bool {
    let manifest_path = Path::new(&install_path)
        .join("Ether")
        .join(folder_name)
        .join("manifest.json");
    manifest_path.exists()
}
