import React from "react";
import { NavLink } from "react-router-dom";
import "./Header.css";

function Header() {
  return (
    <nav className="header">
      <NavLink
        exact
        to="/"
        activeClassName="header__link--active"
        className="header__link"
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/states"
        activeClassName="header__link--active"
        className="header__link"
      >
        States
      </NavLink>
      <NavLink
        to="/deviceManager"
        activeClassName="header__link--active"
        className="header__link"
      >
        Device Manager
      </NavLink>
      <NavLink
        to="/query"
        activeClassName="header__link--active"
        className="header__link"
      >
        Query
      </NavLink>
    </nav>
  );
}

export { Header };
