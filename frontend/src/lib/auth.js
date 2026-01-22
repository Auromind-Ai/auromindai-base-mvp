export const setToken = (token) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
    }
};

export const getToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

export const removeToken = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('workspace');
    }
};

export const setUser = (user) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
    }
};

export const getUser = () => {
    if (typeof window !== 'undefined') {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    return null;
};

export const setWorkspace = (workspace) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('workspace', JSON.stringify(workspace));
    }
};

export const getWorkspace = () => {
    if (typeof window !== 'undefined') {
        const workspace = localStorage.getItem('workspace');
        return workspace ? JSON.parse(workspace) : null;
    }
    return null;
};

export const isAuthenticated = () => {
    return !!getToken();
};

export const logout = () => {
    removeToken();
    if (typeof window !== 'undefined') {
        window.location.href = '/login';
    }
};
