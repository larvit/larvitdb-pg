import { LogInstance } from 'larvitutils';

type ConnectOptions = {
	host?: string;
	port?: number;
	user?: string;
	password?: string;
	database?: string;
	connectionString?: string;
};

type DbSubField = string | number | boolean;

type DbField = DbSubField | DbSubField[];

type DbInitOptions = {
	log?: LogInstance;
	connectionString?: string;
	host?: string;
	port?: number;
	user?: string;
	password?: string;
	database?: string;
};

type QueryResponse = {
	rows: QueryResponseRow[];
	fields: QueryResponseField[];
};

type QueryResponseField = {
	name: string;
	format: string;
};

type QueryResponseRow = {
	[key: string]: any;
};

export { ConnectOptions, DbField, DbInitOptions, LogInstance, QueryResponse, QueryResponseField, QueryResponseRow };
