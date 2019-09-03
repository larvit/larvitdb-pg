import { Client, Pool, PoolClient } from 'pg';
import { Utils, Log, LogInstance } from 'larvitutils';
import { ConnectOptions, DbField, DbInitOptions, QueryResponse, QueryOptions } from './models';

const topLogPrefix = 'larvitdb-pg: src/index.ts: ';

class Db {
	public pool?: Pool;
	public isConnected: boolean = false;
	public poolIsEnded: boolean = false;
	private connectOptions: ConnectOptions;
	private log: LogInstance;
	private lUtils: Utils;

	constructor(options?: DbInitOptions) {
		if (!options) {
			options = {};
		}

		if (!options.log) {
			this.log = new Log();
		} else {
			this.log = options.log;
		}

		if (typeof options.connectionString === 'string') {
			this.connectOptions = {
				connectionString: options.connectionString,
			};
		} else {
			this.connectOptions = {};

			if (options.host) { this.connectOptions.host = options.host; }
			if (options.port) { this.connectOptions.port = options.port; }
			if (options.user) { this.connectOptions.user = options.user; }
			if (options.password) { this.connectOptions.password = options.password; }
			if (options.database) { this.connectOptions.database = options.database; }
		}

		this.lUtils = new Utils({ log: this.log });
	}

	public async connect(): Promise<void> {
		const logPrefix = topLogPrefix + 'Db:connect() - ';
		const { connectOptions, log, lUtils } = this;

		log.debug(logPrefix + 'Trying to connecting to database');

		async function tryToConnect(): Promise<void> {
			const subLogPrefix = logPrefix + 'tryToConnect() - ';

			try {
				const dbCon = new Client(connectOptions);
				await dbCon.connect();
				await dbCon.query('SELECT NOW()');
				await dbCon.end();
				return;
			} catch (err) {
				const retryIntervalSeconds = 1;

				log.warn(subLogPrefix + 'Could not connect to database, retrying in ' + retryIntervalSeconds + ' seconds. err: ' + err.message);

				await lUtils.setTimeout(retryIntervalSeconds * 1000);

				return await tryToConnect();
			}
		}

		await tryToConnect();

		log.verbose(logPrefix + 'Database connection test successfull, creating pool');

		this.pool = new Pool(connectOptions);
		this.isConnected = true;

		// the pool will emit an error on behalf of any idle clients
		// it contains if a backend error or network partition happens
		this.pool.on('error', err /*, client */ => {
			log.error(logPrefix + 'Unexpected error on idle client in pool: ' + err.message);
			throw err;
		});
	}

	public async getConnection(): Promise<PoolClient> {
		const logPrefix = topLogPrefix + 'getConnection() - ';

		await this.ready();
		const { log, pool } = this;

		if (pool === undefined) {
			const err = new Error('this.pool is undefined');
			log.error(logPrefix + err.message);
			throw err;
		}

		const client = await pool.connect();

		return client;
	}

	public async ready(): Promise<void> {
		if (this.isConnected === false) {
			await this.connect();
		}

		return;
	}

	public async resetSchema(schemaName: string): Promise<void> {
		const logPrefix = topLogPrefix + 'resetSchema() - schemaName: "' + schemaName + '" - ';
		const { log } = this;

		log.info(logPrefix + 'Resetting schema, removing all tables!');

		let sql = '';
		sql += 'DROP SCHEMA ' + schemaName + ' CASCADE;';
		sql += 'CREATE SCHEMA ' + schemaName + ';';
		sql += 'GRANT ALL ON SCHEMA ' + schemaName + ' TO ' + schemaName + ';';
		sql += 'COMMENT ON SCHEMA ' + schemaName + ' IS \'' + schemaName + ' schema\';';
		await this.query(sql);
	}

	public async query(sql: string, dbFields?: DbField[], options?: QueryOptions): Promise<QueryResponse> {
		const logPrefix = topLogPrefix + 'query() - ';

		if (this.poolIsEnded === true) {
			const err = new Error('Pool is marked as ended, no queries should be ran towards it.');
			this.log.error(logPrefix + err.message);
			throw err;
		}

		await this.ready();
		const { log, pool } = this;

		if (pool === undefined) {
			const err = new Error('this.pool is undefined');
			log.error(logPrefix + err.message);
			throw err;
		}

		log.debug(logPrefix + 'Running SQL query. SQL: "' + sql + '", fields: "' + JSON.stringify(dbFields) + '"');

		let result;

		try {
			result = await pool.query(sql, dbFields);
		} catch (err) {
			if (options && options.doNotLogErrors === true) {
				log.verbose(logPrefix + 'Error running SQL query: ' + err.message + ' SQL: "' + sql + '", dbFields: "' + JSON.stringify(dbFields) + '"');
			} else {
				log.error(logPrefix + 'Error running SQL query: ' + err.message + ' SQL: "' + sql + '", dbFields: "' + JSON.stringify(dbFields) + '"');
			}
			throw err;
		}

		return result;
	}

	public async end(): Promise<void> {
		const logPrefix = topLogPrefix + 'end() - ';
		const { log, pool, lUtils } = this;

		log.verbose(logPrefix + 'Trying to end pool');

		this.poolIsEnded = true;

		if (pool === undefined) {
			log.verbose(logPrefix + 'No pool configured, no ending needed');
			return;
		}

		// Wait a second to make sure all minor queries have had time to run.
		await lUtils.setTimeout(1000);

		await pool.end();
		log.verbose(logPrefix + 'Pool is ended');
	}
}

export { Db, ConnectOptions, DbField, DbInitOptions, QueryResponse };
