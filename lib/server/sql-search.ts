/**
 * Quote a user's literal search text for a PostgreSQL ILIKE expression.
 * A dedicated '~' escape avoids differences in standard_conforming_strings.
 * Never interpolate the returned value into SQL: always bind it as a parameter.
 */
export function literalLikePattern(value:string):string{
 return "%"+value.replace(/[~%_]/g,character=>"~"+character)+"%";
}
