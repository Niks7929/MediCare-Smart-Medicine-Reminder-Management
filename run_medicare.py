#!/usr/bin/env python3
"""
MediCare+ — Single-Command Standalone Python Launcher
=====================================================
Usage:
    python run_medicare.py
    
This script will:
1. Initialize the SQLite database schema and sample data.
2. Check for dependencies (Flask, etc.).
3. Start the MediCare+ server on port 5000 (or specified PORT).
4. Automatically fallback to Python Standard Library http.server if Flask is not installed.
"""

import sys
import os

def main():
    print("=" * 65)
    print("  💊 MediCare+ — Smart Medicine Reminder & Adherence System")
    print("  Python Native Full-Stack Application")
    print("=" * 65)

    # 1. Initialize SQLite Database
    try:
        from database.db import initialize_database, DB_PATH
        initialize_database()
        print(f"  [✓] SQLite Database ready: {DB_PATH}")
    except Exception as e:
        print(f"  [!] Database initialization notice: {e}")

    # 2. Check for Flask
    port = int(os.environ.get('PORT', 5000))
    try:
        import flask
        import flask_cors
        print(f"  [✓] Flask framework detected (v{flask.__version__})")
        print(f"  [✓] Launching Flask web server on http://localhost:{port} ...")
        print("=" * 65)
        
        from app import app
        app.run(host='0.0.0.0', port=port, debug=True)
    except ImportError:
        print("  [i] Flask not installed in current environment.")
        print(f"  [✓] Launching Pure Python Built-in Server on http://localhost:{port} ...")
        print("=" * 65)
        
        from python_server import run_server
        run_server(port=port)

if __name__ == '__main__':
    main()
