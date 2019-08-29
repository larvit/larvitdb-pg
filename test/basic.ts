import test from 'tape';
import dotenv from 'dotenv';
import { Log } from 'larvitutils';
import { Db } from '../src/index';

const log = new Log();
let db: Db;

dotenv.config();

test('Setup database connection', async t => {
	const dbConf = {
		log,
		host: process.env.DB_HOST,
		port: process.env.DB_PORT === undefined ? undefined : Number(process.env.DB_PORT),
		user: process.env.DB_USER || 'postgres',
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE || 'test',
		connectionString: process.env.DB_CONNECTIONSTRING,
	};

	db = new Db(dbConf);

	const res = await db.query('SELECT NOW()');

	t.equal(res.rows[0].now instanceof Date, true);

	t.end();
});

if (process.env.CLEAR_DB === 'true') {
	test('Cleanup', async t => {
		let sql = '';
		sql += 'DROP SCHEMA public CASCADE;';
		sql += 'CREATE SCHEMA public;';
		sql += 'GRANT ALL ON SCHEMA public TO public;';
		sql += 'COMMENT ON SCHEMA public IS \'standard public schema\';';
		await db.query(sql);
		t.end();
	});
}

test('Insert data', async t => {
	await db.query('CREATE TABLE tmp (id serial PRIMARY KEY, name VARCHAR(50) NOT NULL)');
	await db.query('INSERT INTO tmp VALUES($1,$2),($3,$4)', [1, 'Bosse', 2, 'Greta']);

	const res = await db.query('SELECT * FROM tmp');

	t.equal(res.rows.length, 2);

	await db.query('DROP TABLE tmp');

	t.end();
});

test('Multiple rows with array field', async t => {
	await db.query('CREATE TABLE tmp (id serial PRIMARY KEY, name VARCHAR(50) NOT NULL)');
	await db.query('INSERT INTO tmp VALUES($1,$2),($3,$4),($5,$6)', [1, 'Bosse', 2, 'Greta', 3, 'Lasse-Majja']);

	const res = await db.query('SELECT * FROM tmp WHERE id = ANY($1)', [[1, 3]]);

	t.equal(res.rows.length, 2);
	t.equal(res.rows[1].name, 'Lasse-Majja');

	await db.query('DROP TABLE tmp');

	t.end();
});

test('Use a checked out client', async t => {
	const client = await db.getConnection();

	await client.query('CREATE TABLE tmp (id serial PRIMARY KEY, name VARCHAR(50) NOT NULL)');
	await client.query('INSERT INTO tmp VALUES($1,$2),($3,$4),($5,$6)', [1, 'Bosse', 2, 'Greta', 3, 'Lasse-Majja']);

	const res = await client.query('SELECT * FROM tmp');

	t.equal(res.rows.length, 3);

	await client.query('DROP TABLE tmp');
	await client.release();

	t.end();
});

test('Multiple statements', async t => {
	const client = await db.getConnection();

	await client.query('CREATE TABLE tmp (id serial PRIMARY KEY, name VARCHAR(50) NOT NULL)');
	await client.query('INSERT INTO tmp VALUES(1,\'Bosse\'),(2,\'Nisse\');INSERT INTO tmp VALUES(3,\'Greta\');');

	const res = await client.query('SELECT * FROM tmp');

	t.equal(res.rows.length, 3);

	await client.query('DROP TABLE tmp');
	await client.release();

	t.end();
});

test('Wrap up db connection', async t => {
	await db.end();

	t.end();
});
