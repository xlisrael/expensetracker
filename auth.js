// auth.js - Google OAuth handling

// Check if user is logged in
function isAuthenticated() {
    return !!localStorage.getItem('google_user');
}

// Get user info
function getUserInfo() {
    const userStr = localStorage.getItem('google_user');
    return userStr ? JSON.parse(userStr) : null;
}

// Get user's display name
function getUserName() {
    const user = getUserInfo();
    return user ? user.name : 'Student';
}

// Get user's email
function getUserEmail() {
    const user = getUserInfo();
    return user ? user.email : '';
}

// Get user's profile picture
function getUserPicture() {
    const user = getUserInfo();
    return user ? user.picture : '';
}

// Logout function
function logout() {
    // Revoke Google token if exists
    const token = localStorage.getItem('google_token');
    if (token && window.google?.accounts?.oauth2?.revoke) {
        google.accounts.oauth2.revoke(token, () => {
            console.log('Google token revoked');
        });
    }
    
    // Clear local storage
    localStorage.removeItem('google_token');
    localStorage.removeItem('google_user');
    
    // Redirect to landing page
    window.location.href = 'landing.html';
}

// Parse JWT token to get user info
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Handle the OAuth redirect and store user info
function handleOAuthRedirect() {
    // Check if we have a token in the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const idToken = hashParams.get('id_token');
    
    if (idToken) {
        // Parse user info from ID token
        const userInfo = parseJwt(idToken);
        if (userInfo) {
            const user = {
                name: userInfo.name,
                email: userInfo.email,
                picture: userInfo.picture,
                sub: userInfo.sub
            };
            
            // Store in localStorage
            localStorage.setItem('google_token', accessToken || '');
            localStorage.setItem('google_user', JSON.stringify(user));
            
            // Clean up URL
            window.location.hash = '';
            return true;
        }
    }
    return false;
}

// Initialize auth check on main page
function initAuth() {
    // Handle redirect from Google login
    if (window.location.hash && window.location.hash.includes('id_token')) {
        handleOAuthRedirect();
    }
    
    // Check if authenticated
    if (!isAuthenticated() && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
        return false;
    }
    
    return isAuthenticated();
}

// Make functions globally available
window.isAuthenticated = isAuthenticated;
window.getUserInfo = getUserInfo;
window.getUserName = getUserName;
window.getUserEmail = getUserEmail;
window.getUserPicture = getUserPicture;
window.logout = logout;
window.initAuth = initAuth;

// // auth.js - Simplified Google OAuth handling

// // Get user info
// function getUserInfo() {
//     const userStr = localStorage.getItem('google_user');
//     return userStr ? JSON.parse(userStr) : null;
// }

// // Get user's display name
// function getUserName() {
//     const user = getUserInfo();
//     return user ? user.name : 'Student';
// }

// // Get user's email
// function getUserEmail() {
//     const user = getUserInfo();
//     return user ? user.email : '';
// }

// // Get user's profile picture
// function getUserPicture() {
//     const user = getUserInfo();
//     return user ? user.picture : '';
// }

// // Check if user is logged in
// function isAuthenticated() {
//     return !!localStorage.getItem('google_user');
// }

// // Logout function
// function logout() {
//     // Clear local storage
//     localStorage.removeItem('google_token');
//     localStorage.removeItem('google_user');
    
//     // Redirect to landing page
//     window.location.href = 'landing.html';
// }

// // Initialize auth check on main page
// function initAuth() {
//     if (!isAuthenticated() && !window.location.pathname.includes('landing.html')) {
//         window.location.href = 'landing.html';
//         return false;
//     }
//     return isAuthenticated();
// }

// // Make functions globally available
// window.getUserInfo = getUserInfo;
// window.getUserName = getUserName;
// window.getUserEmail = getUserEmail;
// window.getUserPicture = getUserPicture;
// window.isAuthenticated = isAuthenticated;
// window.logout = logout;
// window.initAuth = initAuth;
