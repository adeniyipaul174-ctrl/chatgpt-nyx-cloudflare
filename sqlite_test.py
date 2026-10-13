import sqlite3, pathlib
root=pathlib.Path(__file__).resolve().parents[1]
db=sqlite3.connect(':memory:')
db.executescript((root/'migrations/0001_init.sql').read_text())
tests=0
def check(name, condition):
 global tests
 assert condition, name
 tests+=1
 print('✓ SQLite:',name)
# Two users' records remain isolated when every query binds user_id.
db.execute("INSERT INTO memories(id,user_id,text,created_at) VALUES(?,?,?,?)",('m1','alice','Alice secret','2026-01-01'))
db.execute("INSERT INTO memories(id,user_id,text,created_at) VALUES(?,?,?,?)",('m1','bob','Bob secret','2026-01-01'))
check('composite primary key permits same record id for different tenants',db.execute('SELECT COUNT(*) FROM memories').fetchone()[0]==2)
check('tenant-scoped memory query returns only caller data', [r[0] for r in db.execute('SELECT text FROM memories WHERE user_id=?',('alice',))]==['Alice secret'])
db.execute("INSERT INTO tasks(id,user_id,title,status,created_at) VALUES(?,?,?,?,?)",('t1','alice','A task','open','2026-01-01'))
db.execute("INSERT INTO tasks(id,user_id,title,status,created_at) VALUES(?,?,?,?,?)",('t1','bob','B task','done','2026-01-01'))
check('tenant-scoped task update cannot change other user row', db.execute("UPDATE tasks SET status='done' WHERE user_id=? AND id=?",('alice','t1')).rowcount==1 and db.execute("SELECT status FROM tasks WHERE user_id='bob' AND id='t1'").fetchone()[0]=='done')
db.execute("INSERT INTO chats(id,user_id,title,messages_json,route,updated_at) VALUES(?,?,?,?,?,?)",('c1','alice','A','[]','general_chat','2026-01-01'))
db.execute("INSERT INTO chats(id,user_id,title,messages_json,route,updated_at) VALUES(?,?,?,?,?,?)",('c1','bob','B','[]','general_chat','2026-01-01'))
check('composite chat key isolates same chat id across users',db.execute('SELECT COUNT(*) FROM chats').fetchone()[0]==2)
db.execute("INSERT INTO usage_daily(user_id,day,count) VALUES('alice','2026-01-01',1)")
db.execute("INSERT INTO usage_daily(user_id,day,count) VALUES('bob','2026-01-01',7)")
check('daily quota rows are scoped per user',db.execute("SELECT count FROM usage_daily WHERE user_id='alice' AND day='2026-01-01'").fetchone()[0]==1)
db.execute("INSERT INTO usage_minute(user_id,minute,count) VALUES('alice','2026-01-01T10:00',2)")
db.execute("INSERT INTO usage_minute(user_id,minute,count) VALUES('bob','2026-01-01T10:00',9)")
check('per-minute rate limit rows are scoped per user',db.execute("SELECT count FROM usage_minute WHERE user_id='alice' AND minute='2026-01-01T10:00'").fetchone()[0]==2)
try:
 db.execute("INSERT INTO tasks(id,user_id,title,status,created_at) VALUES('bad','alice','bad','pending','now')")
 check('task status constraint rejects invalid state',False)
except sqlite3.IntegrityError:
 check('task status constraint rejects invalid state',True)
print(f'SQLITE_TESTS={tests}')
