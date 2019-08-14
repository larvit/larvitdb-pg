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
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE || 'test',
		connectionString: process.env.DB_CONNECTIONSTRING,
	};

	db = new Db(dbConf);

	const res = await db.query('SELECT NOW()');

	t.equal(res.rows[0].now instanceof Date, true);

	t.end();
});

test('Insert data', async t => {
	await db.query('CREATE TABLE tmp (id serial PRIMARY KEY, name VARCHAR(50) NOT NULL)');
	await db.query('INSERT INTO tmp VALUES($1,$2),($3,$4)', [1, 'Bosse', 2, 'Greta']);

	const res = await db.query('SELECT * FROM tmp');

	t.equal(res.rows.length, 2);

	await db.query('DROP TABLE tmp');

	t.end();
});

test('Wrap up db connection', async t => {
	await db.end();

	t.end();
});
