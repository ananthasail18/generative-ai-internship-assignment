import psycopg2
conn = psycopg2.connect(dbname='courseforge', user='postgres', password='postgres', host='localhost', port=5433)
cur = conn.cursor()
hashed = '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
cur.execute('INSERT INTO users (email, name, password_hash, created_at) VALUES (%s, %s, %s, NOW()) ON CONFLICT DO NOTHING', ('demo@courseforge.dev', 'Demo User', hashed))
conn.commit()
print('Demo user inserted!')
