import { Client, Pool } from 'pg';
import { Utils, Log } from 'larvitutils';
import { ConnectOptions, DbField, DbInitOptions, LogInstance, QueryResponse } from './models.d';

const topLogPrefix = 'larvitdb-pg: src/index.ts: ';

class Db {
	public pool?: Pool;
	public isConnected: boolean = false;
	private connectOptions: ConnectOptions;
	private log: LogInstance;
	private lUtils: Utils;

	constructor(options?: DbInitOptions) {
		if (!options) {
			options = {};
		}

		if (!options.log) {
			this.log = new Log('info');
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

		log.verbose(logPrefix + 'Trying to connecting to database');

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

	public async ready(): Promise<void> {
		if (this.isConnected === false) {
			await this.connect();
		}

		return;
	}

	public async query(sql: string, dbFields?: DbField[]): Promise<QueryResponse> {
		const logPrefix = topLogPrefix + 'query() - ';
		const { log } = this;

		await this.ready();

		if (this.pool === undefined) {
			throw new Error('this.pool is undefined');
		}

		log.verbose(logPrefix + 'Running SQL query. SQL: "' + sql + '", fields: "' + JSON.stringify(dbFields) + '"');

		const result = await this.pool.query(sql, dbFields);

		return result;
	}

	public async end(): Promise<void> {
		if (this.pool === undefined) {
			return;
		}

		await this.pool.end();
	}
}

export { Db };
