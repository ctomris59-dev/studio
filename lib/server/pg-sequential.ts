import type {QueryResult} from "pg";

// A checked-out pg client only runs one command at a time. Explicitly serialize
// independent reads instead of Promise.all(client.query(...)) on one connection.
export async function sequentialPg<T extends readonly (()=>Promise<QueryResult<any>>)[]>(tasks:[...T]):Promise<{[K in keyof T]:Awaited<ReturnType<T[K]>>}>{
 const values:QueryResult<any>[]=[];
 for(const task of tasks)values.push(await task());
 return values as {[K in keyof T]:Awaited<ReturnType<T[K]>>};
}
