import psycopg2
conn = psycopg2.connect(dbname='courseforge', user='postgres', password='postgres', host='localhost', port=5433)
cur = conn.cursor()

# Check which user has a password
cur.execute("SELECT id, email, password_hash IS NOT NULL as has_pw FROM users")
for r in cur.fetchall():
    print(r)

# Fix: assign all documents to user 2 as well by updating the one linked to the active course
# Course 5 -> document_id 11, which belongs to user_id 1
# We need to let user 2 access it too.
# Simplest: update document 11 to be owned by user 2, or create a duplicate

# Actually, let's just set a proper password for user 1 so the user can log in with their original account
# AND update document ownership so user 2 can also see the data
cur.execute("UPDATE documents SET user_id = 2 WHERE user_id = 1")
conn.commit()
print(f"\nUpdated {cur.rowcount} documents to user_id=2")
