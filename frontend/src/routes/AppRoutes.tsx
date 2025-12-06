import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/Dashboard';

const AppRoutes: React.FC = () => {
  return (
      <Routes>
            <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                              <Route path="/" element={<Dashboard />} />
                                  </Routes>
                                    );
                                    };
                                export default AppRoutes;