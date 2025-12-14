import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Dropdown.css';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="dropdown" ref={dropdownRef}>
      <div className="dropdown-trigger" onClick={toggleDropdown}>
        {trigger}
      </div>
      {isOpen && (
        <div className="dropdown-menu">
          {children}
        </div>
      )}
    </div>
  );
};

export const DropdownItem: React.FC<{ to: string, children: React.ReactNode, onClick?: () => void }> = ({ to, children, onClick }) => {
  return (
    <Link to={to} className="dropdown-item" onClick={onClick}>
      {children}
    </Link>
  );
};

export default Dropdown;
