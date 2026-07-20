import psycopg2
conn = psycopg2.connect(dbname='courseforge', user='postgres', password='postgres', host='localhost', port=5433)
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'users';")
print(cur.fetchall())
