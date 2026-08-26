# MediCare+ : Smart Medication Management & Adherence Prediction System

A comprehensive, full-stack Healthcare & Medication Adherence platform designed for Patients, Caregivers, and Clinicians. MediCare+ features automated dosage scheduling, interactive compliance tracking, refill threshold monitoring, digital prescription storage, and Machine Learning-powered adherence risk prediction.

---

## 🌟 Key Features

- **Multi-Role Authentication & Access Control (RBAC)**:
  - **👤 Patient Portal**: Daily dosage schedule, 1-click dose confirmation, snooze timers, and remaining pill inventory.
  - **🩺 Clinician / Doctor Portal**: Clinical patient oversight, medication regimen prescription, and refill request authorization.
  - **🛡️ Caregiver Portal**: Real-time family/ward compliance monitoring, missed dose alerts, and emergency contact integration.
- **Smart Reminder Engine**:
  - Web Speech Synthesis API voice announcements for elderly and visually impaired patients.
  - Audio chiming for timely dosage administration.
- **Machine Learning Adherence Risk Engine**:
  - Predicts high, medium, or low risk of missed doses based on historical adherence percentage, snooze behavior, and regimen complexity.
- **Prescription & Stock Management**:
  - Digital prescription vault with dosage, duration, and doctor instructions.
  - Automatic low-stock warnings with 1-click pharmacy refill requests.
- **Compliance & Audit Logging**:
  - CSV Export of dose logs for clinical consultations.
  - 30-day compliance progress charts.

---

## 🛠️ Technology Stack

- **Backend**: Python 3 (Flask, Flask-CORS, SQLite3, Scikit-learn, Pandas, NumPy)
- **Frontend**: HTML5, Tailwind CSS, Lucide Icons, Modern Responsive JavaScript / React + TypeScript (Vite)
- **Database**: Zero-Configuration Embedded SQLite (`database/medicare.db`) with automatic schema initialization and self-healing.
- **Architecture**: RESTful APIs + Modular MVC pattern.

---

## 📁 Project Structure

```
├── app.py                     # Main Python Flask Application & REST API
├── config.py                  # Application configuration & database paths
├── requirements.txt           # Python dependencies
├── run_medicare.py            # Quick-launch script
├── database/
│   ├── db.py                  # Database connection, helper functions & self-healing init
│   └── medicare.sql           # Database schema & initial clinical records
├── models/                    # Data models (User, Patient, Medicine, Dose, Prescription)
├── ml/
│   └── adherence_prediction.py# Machine Learning risk prediction model
├── templates/                 # Jinja2 HTML Templates (Login, Register, Dashboard, Portals)
├── static/                    # CSS styles, sound effects, icons, and assets
└── src/                       # React / TypeScript modern UI component suite
```

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.8+ installed ([Download Python](https://www.python.org/downloads/))

### Step 1: Clone or Extract the Project
```bash
git clone https://github.com/your-username/medicare-system.git
cd medicare-system
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Run the Application
```bash
python app.py
```

### Step 4: Open in Browser
Visit **[http://localhost:5000](http://localhost:5000)** in your web browser.

---

## 🔑 Demo Login Accounts

You can register a new account on the Registration page or sign in directly using the 1-click buttons or credentials below:

| Role | Email | Password |
|---|---|---|
| **Patient** | `demo@medicare.org` | `password123` |
| **Physician / Doctor** | `doctor@hospital.org` | `password123` |
| **Caregiver** | `caregiver@family.org` | `password123` |

---

## 🗄️ Database Setup
- **No external database server needed!** 
- SQLite is built directly into Python. The database file (`database/medicare.db`) is automatically initialized and self-healed on the first run of `python app.py`.

---

## 📜 License
This project is licensed under the MIT License.
