"""Fund My Startup Django project package."""

import pymysql

# Use PyMySQL as a drop-in replacement for mysqlclient on Windows.
pymysql.install_as_MySQLdb()
