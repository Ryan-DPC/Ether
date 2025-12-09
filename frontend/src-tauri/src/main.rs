// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod installation;
mod launcher;

use installation::{install_game, uninstall_game, is_game_installed, select_folder};
use launcher::launch_game;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            install_game,
            uninstall_game,
            is_game_installed,
            launch_game,
            select_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
