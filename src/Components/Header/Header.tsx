import React from "react";
import { Link } from "react-router-dom";
import "./Header.styles.scss";

export default function Header() {
  return (
    <nav className="Header">
      <div className="HeaderData">
        <div className="Logo">
          <Link to="/" className="Logo_Link">
            <h1>Piano Keys</h1>
          </Link>
        </div>
      </div>
    </nav>
  );
}
