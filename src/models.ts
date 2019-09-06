import { LogInstance } from 'larvitutils';

type ConnectOptions = {
	host?: string;
	port?: number;
	user?: string;
	password?: string;
	database?: string;
	connectionString?: string;
};

type DbConInternal = {
	query(sql: string, dbFields?: DbField[], options?: QueryOptions): Promise<QueryResponse>;
	end(): Promise<void>;
};

type DbSubField = string | number | boolean | null;

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

type QueryOptions = {
	doNotLogErrors?: boolean;
	queryFn?(sql: string, dbFields?: DbField[]): Promise<QueryResponse>;
};

export {
	ConnectOptions,
	DbConInternal,
	DbField,
	DbInitOptions,
	LogInstance,
	QueryResponse,
	QueryResponseField,
	QueryResponseRow,
	QueryOptions,
};
