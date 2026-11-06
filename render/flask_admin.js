/**
 * ISD v1 → Flask-Admin project renderer.
 *
 * A pure function: validate + normalize the Info System Definition, then emit
 * the complete file set of a runnable Flask-Admin application with a bundled
 * SQLite database (instance/app.db) and a uv-based launcher.
 *
 * Ported 1:1 from the battle-tested Jinja2 templates of the Info System Agent
 * repository (oma_info_system/generation/templates @ e8b31ce), with the
 * SQLAlchemy-centric field types replaced by a neutral ISD type system.
 */

/** Neutral ISD types → SQLAlchemy column types. */
const SQLALCHEMY_TYPES = {
  string: 'String',
  text: 'Text',
  integer: 'Integer',
  float: 'Float',
  boolean: 'Boolean',
  date: 'Date',
  time: 'Time',
  datetime: 'DateTime',
};

const MAX_MODULES = 12;
const MAX_FIELDS_PER_MODULE = 30;

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const SNAKE_CASE = /^[a-z][a-z0-9_]*$/;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/** Reserved field names auto-added by the system contract. */
const RESERVED_FIELDS = new Set(['id', 'created_time', 'modified_time']);

export class IsdValidationError extends Error {
  constructor(errors) {
    super(`Invalid ISD: ${errors.map((e) => e.path ? `${e.path}: ${e.message}` : e.message).join('; ')}`);
    this.name = 'IsdValidationError';
    this.errors = errors;
  }
}

/**
 * Validate and normalize an ISD document.
 * @param {unknown} raw - parsed ISD JSON.
 * @returns {{ isd: object, warnings: string[] }} normalized ISD.
 * @throws {IsdValidationError} on contract violations.
 */
export function validateAndNormalize(raw) {
  const errors = [];
  const warnings = [];
  const fail = (path, message) => errors.push({ path, message });
  const warn = (message) => warnings.push(message);

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new IsdValidationError([{ path: '', message: 'ISD must be a JSON object' }]);
  }
  if (raw.isd_version !== 1) {
    // Accept missing version (implied 1) but reject unknown futures loudly.
    if (raw.isd_version !== undefined) fail('isd_version', 'must be 1');
  }

  const projectRaw = raw.project ?? {};
  if (typeof projectRaw !== 'object' || projectRaw === null) fail('project', 'must be an object');
  const name = typeof projectRaw.name === 'string' && projectRaw.name.trim() ? projectRaw.name.trim() : fail('project.name', 'must be a non-empty string');
  let code = typeof projectRaw.code === 'string' ? projectRaw.code.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
  if (!code) code = slugify(name) || 'info-system';
  if (!SLUG.test(code)) fail('project.code', `must match ${SLUG}`);

  const reqRaw = raw.requirements ?? {};
  const stackRaw = raw.stack ?? {};
  const target = stackRaw.target ?? 'flask-admin';
  if (target !== 'flask-admin') fail('stack.target', `v1 renderer supports only "flask-admin" (got "${target}")`);
  const theme = typeof stackRaw.theme === 'string' && stackRaw.theme ? stackRaw.theme : 'yeti';

  const modulesRaw = raw.modules;
  if (!Array.isArray(modulesRaw) || modulesRaw.length === 0) fail('modules', 'must be a non-empty array');
  else if (modulesRaw.length > MAX_MODULES) fail('modules', `too many modules (${modulesRaw.length} > ${MAX_MODULES})`);

  const seenModule = new Set();
  const modules = Array.isArray(modulesRaw) ? modulesRaw.map((m, i) => {
    const base = `modules[${i}]`;
    if (typeof m !== 'object' || m === null) { fail(base, 'must be an object'); return null; }
    const mName = m.name;
    if (typeof mName !== 'string' || !PASCAL_CASE.test(mName)) fail(`${base}.name`, `must be PascalCase like "BookManagement" (got "${mName}")`);
    else if (mName === 'User') fail(`${base}.name`, 'is reserved by the built-in user model');
    else if (seenModule.has(mName)) fail(`${base}.name`, `duplicate module "${mName}"`);
    else seenModule.add(mName);

    const label = typeof m.label === 'string' && m.label.trim() ? m.label.trim() : mName;
    if (label === mName) warn(`module ${mName} has no label; using the name as display label`);

    const fieldsRaw = m.fields;
    if (!Array.isArray(fieldsRaw) || fieldsRaw.length === 0) fail(`${base}.fields`, 'must be a non-empty array');
    else if (fieldsRaw.length > MAX_FIELDS_PER_MODULE) fail(`${base}.fields`, `too many fields (${fieldsRaw.length} > ${MAX_FIELDS_PER_MODULE})`);

    const seenField = new Set();
    const fields = Array.isArray(fieldsRaw) ? fieldsRaw.map((f, j) => {
      const fBase = `${base}.fields[${j}]`;
      if (typeof f !== 'object' || f === null) { fail(fBase, 'must be an object'); return null; }
      const fName = f.name;
      if (typeof fName !== 'string' || !SNAKE_CASE.test(fName)) fail(`${fBase}.name`, `must be snake_case like "book_name" (got "${fName}")`);
      else if (RESERVED_FIELDS.has(fName)) fail(`${fBase}.name`, `"${fName}" is auto-added by the system`);
      else if (fName === 'password_hash') fail(`${fBase}.name`, 'is reserved by the built-in user model');
      else if (seenField.has(fName)) fail(`${fBase}.name`, `duplicate field "${fName}"`);
      else seenField.add(fName);

      const fType = typeof f.type === 'string' ? f.type.toLowerCase() : undefined;
      if (!(fType in SQLALCHEMY_TYPES)) fail(`${fBase}.type`, `must be one of ${Object.keys(SQLALCHEMY_TYPES).join('/')} (got "${f.type}")`);

      return {
        name: fName,
        label: typeof f.label === 'string' && f.label.trim() ? f.label.trim() : fName,
        type: fType,
        required: f.required === true,
        search: f.search === true,
        description: typeof f.description === 'string' ? f.description : '',
      };
    }).filter(Boolean) : [];

    return {
      name: mName,
      label,
      description: typeof m.description === 'string' ? m.description : '',
      fields,
    };
  }).filter(Boolean) : [];

  if (errors.length) throw new IsdValidationError(errors);

  return {
    isd: {
      isd_version: 1,
      project: { name, code, version: 'V1.0' },
      requirements: {
        description: typeof reqRaw.description === 'string' ? reqRaw.description : '',
        domain: typeof reqRaw.domain === 'string' ? reqRaw.domain : '',
        notes: Array.isArray(reqRaw.notes) ? reqRaw.notes : [],
      },
      stack: { target, theme },
      modules,
    },
    warnings,
  };
}

/** URL-safe slug from a (possibly Chinese) project name. */
function slugify(name) {
  const ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (ascii) return ascii;
  // Non-ASCII names: deterministic readable fallback.
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return `system-${hash.toString(36)}`;
}

/** Python single-quoted string literal. */
function pyStr(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Render the complete Flask-Admin project file set.
 * @param {object} isd - normalized ISD.
 * @param {{ secret_key: string, admin_account: string, admin_password: string }} opts
 * @returns {{ files: Record<string, string> }} relative path → file content.
 */
export function renderFlaskAdmin(isd, opts) {
  const { project, modules } = isd;
  const secretKey = opts.secret_key;
  const adminAccount = opts.admin_account || 'admin';
  const adminPassword = opts.admin_password || 'admin123';
  const files = {};

  files['extensions.py'] = `"""Extensions for ${project.name}."""

from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

# Initialize extensions
db = SQLAlchemy()
bcrypt = Bcrypt()
`;

  files['models.py'] = renderModels(isd);
  files['views.py'] = renderViews(isd);
  files['app.py'] = renderApp(isd);
  files['config.py'] = renderConfig(isd, secretKey);
  files['run.py'] = `#!/usr/bin/env python3
"""Run script for ${project.name}."""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=5000, help='Port to run on')
    parser.add_argument('--init-db', action='store_true', help='Initialize database')
    args = parser.parse_args()

    app = create_app()

    if args.init_db:
        with app.app_context():
            db.create_all()
            print('Database initialized!')
        sys.exit(0)

    app.run(host='127.0.0.1', port=args.port, debug=False)
`;

  files['run.sh'] = `#!/bin/bash

# Start script for ${project.name}

echo "Starting ${project.name}..."

# Install dependencies with uv
uv sync

# Initialize database
uv run python -c "from app import app, db; app.app_context().push(); db.create_all(); print('Database initialized')"

# Run the application
uv run python -c "
from app import create_app
import webbrowser
import threading
import time

def open_browser():
    time.sleep(2)
    webbrowser.open('http://localhost:5000/admin/')

app = create_app()
threading.Thread(target=open_browser).start()
app.run(host='127.0.0.1', port=5000, debug=True)
"
`;

  files['pyproject.toml'] = `[project]
name = "${project.code}"
version = "${project.version}"
description = "${project.name}"
requires-python = ">=3.8"
dependencies = [
    "flask>=3.0.0",
    "flask-admin>=1.6.0",
    "flask-sqlalchemy>=3.1.0",
    "flask-bcrypt>=1.0.0",
    "flask-login>=0.6.0",
    "flask-babel>=4.0.0",
    "wtforms>=3.0.0",
]

# Deliberately no [build-system]: this is a flat, run-in-place application
# (uv sync treats it as a virtual project and installs only the dependencies
# above; declaring hatchling would make uv try to build the project itself
# into a wheel and fail on the flat layout).
`;

  files['.gitignore'] = `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python

# Virtual environment
venv/
env/
ENV/
.venv

# Flask
instance/
.webassets-cache

# Database
*.db
*.sqlite
*.sqlite3

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
`;

  files['.env.example'] = `# Environment Configuration
SECRET_KEY=${secretKey}
FLASK_ENV=development
DATABASE_URL=sqlite:///instance/app.db
`;

  files['README.md'] = renderReadme(isd, adminAccount, adminPassword);

  // The ISD itself is part of the deliverable: the user's editable source of truth.
  files['project.json'] = `${JSON.stringify(isd, null, 2)}\n`;

  return { files };
}

function renderModels(isd) {
  const { project, modules } = isd;
  const out = [];
  out.push(`"""SQLAlchemy models for ${project.name}."""`);
  out.push('');
  out.push('from extensions import db');
  out.push('from flask_bcrypt import generate_password_hash, check_password_hash');
  out.push('from datetime import datetime');
  out.push('');
  out.push('');
  out.push('class User(db.Model):');
  out.push('    """User model for authentication."""');
  out.push("    __tablename__ = 'users'");
  out.push('');
  out.push('    id = db.Column(db.Integer, primary_key=True)');
  out.push('    username = db.Column(db.String(80), unique=True, nullable=False)');
  out.push('    password_hash = db.Column(db.String(128), nullable=False)');
  out.push('    created_time = db.Column(db.DateTime, default=datetime.utcnow)');
  out.push('    modified_time = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)');
  out.push('');
  out.push('    def set_password(self, password):');
  out.push('        """Set password hash."""');
  out.push("        self.password_hash = generate_password_hash(password).decode('utf-8')");
  out.push('');
  out.push('    def check_password(self, password):');
  out.push('        """Check password against hash."""');
  out.push('        return check_password_hash(self.password_hash, password)');
  for (const module of modules) {
    out.push('');
    out.push('');
    out.push(`class ${module.name}(db.Model):`);
    out.push(`    """${module.description || module.label}"""`);
    out.push(`    __tablename__ = '${module.name.toLowerCase()}s'`);
    out.push('');
    out.push('    id = db.Column(db.Integer, primary_key=True)');
    out.push('    created_time = db.Column(db.DateTime, default=datetime.utcnow)');
    out.push('    modified_time = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)');
    for (const field of module.fields) {
      const parts = [`db.${SQLALCHEMY_TYPES[field.type]}`];
      if (field.required) parts.push('nullable=False');
      if (field.search) parts.push('index=True');
      out.push(`    ${field.name} = db.Column(${parts.join(', ')})`);
    }
  }
  out.push('');
  return out.join('\n');
}

function renderViews(isd) {
  const { modules } = isd;
  const out = [];
  out.push(`"""Flask-Admin views for ${isd.project.name}."""`);
  out.push('');
  out.push('from flask_admin import Admin, AdminIndexView, expose');
  out.push('from flask_admin.contrib.sqla import ModelView');
  out.push('');
  out.push('');
  out.push('class UserView(ModelView):');
  out.push('    """Chinese labels for the built-in user model."""');
  out.push('    column_labels = {');
  out.push("        'id': '编号',");
  out.push("        'username': '用户名',");
  out.push("        'password_hash': '密码哈希',");
  out.push("        'created_time': '创建时间',");
  out.push("        'modified_time': '修改时间',");
  out.push('    }');
  for (const module of modules) {
    out.push('');
    out.push('');
    out.push(`class ${module.name}View(ModelView):`);
    out.push(`    """Chinese labels for ${module.label}."""`);
    out.push('    column_labels = {');
    out.push("        'id': '编号',");
    out.push("        'created_time': '创建时间',");
    out.push("        'modified_time': '修改时间',");
    for (const field of module.fields) {
      out.push(`        ${pyStr(field.name)}: ${pyStr(field.label)},`);
    }
    out.push('    }');
  }
  out.push('');
  return out.join('\n');
}

function renderApp(isd) {
  const { project, modules } = isd;
  const out = [];
  out.push(`"""Flask application factory for ${project.name}."""`);
  out.push('');
  out.push('from flask import Flask, request, session');
  out.push('from flask_babel import Babel');
  out.push('from flask_admin import Admin');
  out.push('');
  out.push('from extensions import db');
  out.push('from models import *');
  out.push('from views import *');
  out.push('from config import Config');
  out.push('');
  out.push('');
  out.push('def get_locale():');
  out.push('    """Use Chinese by default, with an optional explicit language switch."""');
  out.push("    requested = request.args.get('lang')");
  out.push("    if requested in ('zh', 'zh_CN', 'en'):");
  out.push("        session['lang'] = 'zh_CN' if requested in ('zh', 'zh_CN') else 'en'");
  out.push("    return session.get('lang', 'zh_CN')");
  out.push('');
  out.push('');
  out.push('def create_app(config_class=Config):');
  out.push('    """Create and configure the Flask application."""');
  out.push('    app = Flask(__name__)');
  out.push('    app.config.from_object(config_class)');
  out.push('    Babel(app, locale_selector=get_locale)');
  out.push('');
  out.push('    # Initialize extensions');
  out.push('    db.init_app(app)');
  out.push('');
  out.push('    # Create admin interface');
  out.push(`    admin = Admin(app, name=${pyStr(project.name)})`);
  for (const module of modules) {
    out.push('');
    out.push(`    # ${module.label}`);
    out.push(`    from models import ${module.name}`);
    out.push(`    admin.add_view(${module.name}View(${module.name}, db.session, name=${pyStr(module.label)}))`);
  }
  out.push('');
  out.push('    # User management');
  out.push('    from models import User');
  out.push(`    admin.add_view(UserView(User, db.session, name=${pyStr('用户管理')}))`);
  out.push('');
  out.push('    return app');
  out.push('');
  out.push('');
  out.push("if __name__ == '__main__':");
  out.push('    app = create_app()');
  out.push('    app.run(debug=True, port=5000)');
  out.push('');
  return out.join('\n');
}

function renderConfig(isd, secretKey) {
  const { project } = isd;
  return `"""Configuration for ${project.name}."""

import os
from pathlib import Path

# Get the instance folder
basedir = Path(__file__).parent


class Config:
    """Base configuration."""

    # Secret key
    SECRET_KEY = os.getenv('SECRET_KEY', ${pyStr(secretKey)})

    # Database
    instance_folder = basedir / 'instance'
    instance_folder.mkdir(exist_ok=True)
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{instance_folder}/app.db'

    # Flask-SQLAlchemy
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Flask-Admin
    FLASK_ADMIN_SWATCH = ${pyStr(isd.stack.theme)}

    # Chinese is the default locale for generated internal systems.
    BABEL_DEFAULT_LOCALE = 'zh_CN'


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
`;
}

function renderReadme(isd, adminAccount, adminPassword) {
  const { project, modules } = isd;
  const lines = [];
  lines.push(`# ${project.name}`);
  lines.push('');
  lines.push(project.version);
  lines.push('');
  lines.push('## Description');
  lines.push('');
  lines.push(`${project.name} is a Flask-Admin based CRUD management system.`);
  lines.push('');
  lines.push('## Installation');
  lines.push('');
  lines.push('1. Install [uv](https://github.com/astral-sh/uv):');
  lines.push('```bash');
  lines.push('curl -LsSf https://astral.sh/uv/install.sh | sh');
  lines.push('```');
  lines.push('');
  lines.push('2. Install dependencies:');
  lines.push('```bash');
  lines.push('uv sync');
  lines.push('```');
  lines.push('');
  lines.push('## Usage');
  lines.push('');
  lines.push('Start the application:');
  lines.push('```bash');
  lines.push('./run.sh');
  lines.push('```');
  lines.push('');
  lines.push('Or manually:');
  lines.push('```bash');
  lines.push('uv run python -c "from app import app, db; app.app_context().push(); db.create_all()"');
  lines.push('uv run python -c "from app import create_app; app = create_app(); app.run()"');
  lines.push('```');
  lines.push('');
  lines.push('## Access');
  lines.push('');
  lines.push('- URL: http://localhost:5000/admin/');
  lines.push(`- Username: ${adminAccount}`);
  lines.push(`- Password: ${adminPassword}`);
  lines.push('');
  lines.push('## Modules');
  lines.push('');
  for (const module of modules) {
    lines.push(`- ${module.label} (${module.name}): ${module.description}`);
  }
  lines.push('');
  lines.push('## Configuration');
  lines.push('');
  lines.push('Configuration files:');
  lines.push('- `config.py`: Application configuration');
  lines.push('- `.env`: Environment variables (copy from `.env.example`)');
  lines.push('');
  lines.push('## Regenerate');
  lines.push('');
  lines.push('This project was generated from `project.json` (the ISD definition).');
  lines.push('Edit that file and re-render to evolve the system.');
  lines.push('');
  lines.push('## License');
  lines.push('');
  lines.push('MIT License');
  lines.push('');
  return lines.join('\n');
}
