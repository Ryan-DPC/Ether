import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import MainLayout from '../components/MainLayout.vue'
import Home from '../views/Home.vue'
import Library from '../views/Library.vue'
import Marketplace from '../views/Marketplace.vue'
import Store from '../views/Store.vue'
import Profile from '../views/Profile.vue'
import Admin from '../views/Admin.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: Login
        },
        {
            path: '/register',
            name: 'register',
            component: Register
        },
        {
            path: '/forgot-password',
            name: 'forgot-password',
            component: () => import('../views/ForgotPassword.vue')
        },
        {
            path: '/reset-password',
            name: 'reset-password',
            component: () => import('../views/ResetPassword.vue')
        },
        {
            path: '/api/auth/github/callback',
            name: 'auth-callback',
            component: () => import('../views/AuthCallback.vue')
        },
        {
            path: '/',
            component: MainLayout,
            children: [
                {
                    path: '',
                    redirect: '/home'
                },
                {
                    path: 'home',
                    name: 'home',
                    component: Home,
                    meta: { requiresAuth: true }
                },
                {
                    path: 'library',
                    name: 'library',
                    component: Library,
                    meta: { requiresAuth: true }
                },
                {
                    path: 'marketplace',
                    name: 'marketplace',
                    component: Marketplace,
                    meta: { requiresAuth: true }
                },
                {
                    path: 'store',
                    name: 'store',
                    component: Store,
                    meta: { requiresAuth: true }
                },
                {
                    path: 'social',
                    name: 'social',
                    component: () => import('../views/Social.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: 'profile',
                    name: 'profile',
                    component: Profile,
                    meta: { requiresAuth: true }
                },
                {
                    path: 'profile/:userId',
                    name: 'user-profile',
                    component: () => import('../views/UserProfile.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: 'chat/:friendId',
                    name: 'chat',
                    component: () => import('../views/Chat.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: 'admin',
                    name: 'admin',
                    component: Admin,
                    meta: { requiresAuth: true, requiresAdmin: true }
                },
                {
                    path: 'games/details/:id',
                    name: 'game-details',
                    component: () => import('../views/GameDetails.vue'),
                    meta: { requiresAuth: true }
                },
                {
                    path: 'terms',
                    name: 'terms',
                    component: () => import('../views/Terms.vue')
                },
                {
                    path: 'privacy',
                    name: 'privacy',
                    component: () => import('../views/Privacy.vue')
                }
            ]
        }
    ]
})

router.beforeEach(async (to, _from, next) => {
    const userStore = useUserStore()

    // If going to login/register, just proceed
    if (to.path === '/login' || to.path === '/register') {
        if (userStore.isAuthenticated) {
            next('/home')
        } else {
            next()
        }
        return
    }

    // Check if we have a token but not authenticated yet
    const token = localStorage.getItem('token')
    if (token && !userStore.isAuthenticated) {
        // Token exists, try to fetch profile
        try {
            await userStore.fetchProfile()
        } catch (e) {
            // Token is invalid, clear it
            localStorage.removeItem('token')
            if (to.meta.requiresAuth) {
                next('/login')
                return
            }
        }
    }

    if (to.meta.requiresAuth && !userStore.isAuthenticated) {
        next('/login')
    } else if (to.meta.requiresAdmin && !userStore.user?.isAdmin) {
        // Redirect non-admin users trying to access admin page
        next('/home')
    } else {
        next()
    }
})

export default router
