import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Library, LayoutGrid, Search as SearchIcon, FileText, UserCircle, LogOut, Bell } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000); // Poll every minute
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get('/api/notifications', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setNotifications(res.data);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    const markAsRead = async () => {
        try {
            await axios.put('/api/notifications/read', {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchNotifications();
            setShowNotifications(false);
        } catch (err) {
            console.error('Error marking notifications read:', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="navbar">
            <div className="nav-logo">
                <Library size={32} />
                <span>Smart Library</span>
            </div>

            <ul className="nav-links">
                {user ? (
                    <>
                        <li className={isActive('/') ? 'active' : ''}>
                            <Link to="/"><LayoutGrid size={18} /> Home</Link>
                        </li>
                        <li className={isActive('/search') ? 'active' : ''}>
                            <Link to="/search"><SearchIcon size={18} /> Search</Link>
                        </li>
                        <li className={isActive('/reports') ? 'active' : ''}>
                            <Link to="/reports"><FileText size={18} /> Reports</Link>
                        </li>
                        <li className="notification-bell" style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', margin: '0 10px' }} onClick={() => setShowNotifications(!showNotifications)}>
                            <Bell size={24} style={{ color: 'var(--gray-600)' }} />
                            {unreadCount > 0 && (
                                <span style={{ position: 'absolute', top: '-5px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                    {unreadCount}
                                </span>
                            )}
                            {showNotifications && (
                                <div className="notifications-dropdown" style={{ position: 'absolute', top: '100%', right: '-50px', width: '300px', background: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: '12px', zIndex: 1000, padding: '1rem', marginTop: '10px', border: '1px solid #eee', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '1rem', color: '#333' }}>Notifications</span>
                                        {unreadCount > 0 && (
                                            <button onClick={markAsRead} style={{ fontSize: '0.8rem', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0 }}>
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <p style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', margin: '20px 0' }}>No notifications</p>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n._id} style={{ padding: '10px', borderBottom: '1px solid #f5f5f5', background: n.read ? 'transparent' : '#f0f9ff', borderRadius: '6px', marginBottom: '5px' }}>
                                                    <p style={{ margin: 0, fontSize: '0.9rem', color: n.read ? '#666' : '#000', lineHeight: '1.4' }}>{n.message}</p>
                                                    <small style={{ color: '#aaa', fontSize: '0.75rem', marginTop: '5px', display: 'block' }}>{new Date(n.createdAt).toLocaleDateString()}</small>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </li>
                        <li className="user-profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <UserCircle size={24} style={{ color: 'var(--primary)' }} />
                        </li>
                        <li>
                            <button onClick={handleLogout} className="logout-btn">
                                <LogOut size={18} /> Logout
                            </button>
                        </li>
                    </>
                ) : (
                    <>
                        <li className={isActive('/login') ? 'active' : ''}>
                            <Link to="/login">Login</Link>
                        </li>
                        <li className={isActive('/register') ? 'active' : ''}>
                            <Link to="/register" className="auth-btn" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', width: 'auto' }}>
                                Sign Up
                            </Link>
                        </li>
                    </>
                )}
            </ul>
        </nav>
    );
};

export default Navbar;
