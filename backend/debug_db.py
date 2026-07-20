import psycopg2
conn = psycopg2.connect(dbname='courseforge', user='postgres', password='postgres', host='localhost', port=5433)
cur = conn.cursor()

print("=== Users ===")
cur.execute("SELECT id, email, name FROM users")
for r in cur.fetchall():
    print(r)

print("\n=== Documents ===")
cur.execute("SELECT id, user_id, title FROM documents")
for r in cur.fetchall():
    print(r)

print("\n=== Courses ===")
cur.execute("SELECT id, document_id, title FROM courses")
for r in cur.fetchall():
    print(r)

print("\n=== Lessons (first 5) ===")
cur.execute("SELECT id, topic_id, title FROM lessons LIMIT 5")
for r in cur.fetchall():
    print(r)

print("\n=== Stories count ===")
cur.execute("SELECT count(*) FROM stories")
print(cur.fetchone())

print("\n=== Flashcards count ===")
cur.execute("SELECT count(*) FROM flashcards")
print(cur.fetchone())

print("\n=== Quiz questions count ===")
cur.execute("SELECT count(*) FROM quiz_questions")
print(cur.fetchone())
