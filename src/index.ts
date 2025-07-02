/**
 * This file is a modified version of the openapi-fetch client.
 * Source: https://github.com/openapi-ts/openapi-typescript/blob/99c346e06bb41511338d2a8c3752748e5d52a742/packages/openapi-fetch/src/index.js
 */

import {
	HttpBody,
	HttpClient,
	HttpClientRequest,
	UrlParams,
} from "@effect/platform";
import type { HttpClientError } from "@effect/platform/HttpClientError";
import { Data, Effect } from "effect";
import type {
	FilterKeys,
	HttpMethod,
	IsOperationRequestBodyOptional,
	MediaType,
	OperationRequestBodyContent,
	PathsWithMethod,
	RequiredKeysOf,
	ResponseObjectMap,
} from "openapi-typescript-helpers";

// settings & const
const PATH_PARAM_RE = /\{[^{}]+\}/g;

/**
 * Create an openapi-fetch client.
 * @type {import("./index.js").default}
 */
export default function createClient<
	Paths extends {},
	Media extends MediaType = MediaType,
>(clientOptions?: ClientOptions): Client<Paths, Media> {
	let { baseUrl = "" } = { ...clientOptions };
	baseUrl = removeTrailingSlash(baseUrl);

	return {
		/** Call a GET endpoint */
		GET(
			schemaPath: string,
			init?: {
				params?: {
					query?: UrlParams.Input;
					path?: Record<string, string>;
				};
				body?: unknown;
			},
		) {
			const url = createFinalURL(schemaPath, {
				baseUrl,
				params: {
					path: init?.params?.path,
				},
			});

			const request = HttpClientRequest.get(url).pipe(
				HttpClientRequest.acceptJson,
				HttpClientRequest.setUrlParams(
					UrlParams.fromInput(init?.params?.query ?? {}),
				),
			);

			const effect = Effect.gen(function* () {
				const client = yield* HttpClient.HttpClient;
				const response = yield* client.execute(request);
				return {
					data: yield* response.json,
					status: response.status,
				};
			});
			return effect;
		},
		/** Call a PUT endpoint */
		PUT(
			schemaPath: string,
			init?: {
				params?: {
					query?: UrlParams.Input;
					path?: Record<string, string>;
				};
				body?: unknown;
			},
		) {
			const url = createFinalURL(schemaPath, {
				baseUrl,
				params: {
					path: init?.params?.path,
				},
			});

			const effect = Effect.gen(function* () {
				const request = HttpClientRequest.put(url).pipe(
					HttpClientRequest.acceptJson,
					HttpClientRequest.setUrlParams(
						UrlParams.fromInput(init?.params?.query ?? {}),
					),
					HttpClientRequest.setBody(yield* HttpBody.json(init?.body)),
				);

				const client = yield* HttpClient.HttpClient;
				const response = yield* client.execute(request);
				return {
					data: yield* response.json,
					status: response.status,
				};
			});
			return effect;
		},
		/** Call a POST endpoint */
		POST(
			schemaPath: string,
			init?: {
				params?: {
					query?: UrlParams.Input;
					path?: Record<string, string>;
				};
				body?: unknown;
			},
		) {
			const url = createFinalURL(schemaPath, {
				baseUrl,
				params: {
					path: init?.params?.path,
				},
			});

			const effect = Effect.gen(function* () {
				const request = HttpClientRequest.post(url).pipe(
					HttpClientRequest.acceptJson,
					HttpClientRequest.setUrlParams(
						UrlParams.fromInput(init?.params?.query ?? {}),
					),
					HttpClientRequest.setBody(yield* HttpBody.json(init?.body)),
				);

				const client = yield* HttpClient.HttpClient;
				const response = yield* client.execute(request);
				return {
					data: yield* response.json,
					status: response.status,
				};
			});
			return effect;
		},
		/** Call a DELETE endpoint */
		DELETE(
			schemaPath: string,
			init?: {
				params?: {
					query?: UrlParams.Input;
					path?: Record<string, string>;
				};
				body?: unknown;
			},
		) {
			const url = createFinalURL(schemaPath, {
				baseUrl,
				params: {
					path: init?.params?.path,
				},
			});

			const effect = Effect.gen(function* () {
				const request = HttpClientRequest.del(url).pipe(
					HttpClientRequest.acceptJson,
					HttpClientRequest.setUrlParams(
						UrlParams.fromInput(init?.params?.query ?? {}),
					),
					HttpClientRequest.setBody(yield* HttpBody.json(init?.body)),
				);

				const client = yield* HttpClient.HttpClient;
				const response = yield* client.execute(request);
				return {
					data: yield* response.json,
					status: response.status,
				};
			});
			return effect;
		},
		/** Call a PATCH endpoint */
		PATCH(
			schemaPath: string,
			init?: {
				params?: {
					query?: UrlParams.Input;
					path?: Record<string, string>;
				};
				body?: unknown;
			},
		) {
			const url = createFinalURL(schemaPath, {
				baseUrl,
				params: {
					path: init?.params?.path,
				},
			});

			const effect = Effect.gen(function* () {
				const request = HttpClientRequest.post(url).pipe(
					HttpClientRequest.acceptJson,
					HttpClientRequest.setUrlParams(
						UrlParams.fromInput(init?.params?.query ?? {}),
					),
					HttpClientRequest.setBody(yield* HttpBody.json(init?.body)),
				);

				const client = yield* HttpClient.HttpClient;
				const response = yield* client.execute(request);
				return {
					data: yield* response.json,
					status: response.status,
				};
			});
			return effect;
		},
	} as any;
}

// utils

/**
 * Serialize primitive param values
 * @type {import("./index.js").serializePrimitiveParam}
 */
function serializePrimitiveParam(
	name: string,
	value: string | number | boolean,
) {
	if (value === undefined || value === null) {
		return "";
	}
	if (typeof value === "object") {
		throw new Error(
			"Deeply-nested arrays/objects aren’t supported. Provide your own `querySerializer()` to handle these.",
		);
	}
	return `${name}=${encodeURIComponent(value)}`;
}

/**
 * Serialize object param (shallow only)
 * @type {import("./index.js").serializeObjectParam}
 */
function serializeObjectParam(
	name: string,
	value: Record<string, string | number | boolean>,
	options: {
		style: "simple" | "label" | "matrix" | "deepObject" | "form";
		explode: boolean;
	},
) {
	if (!value || typeof value !== "object") {
		return "";
	}
	const values = [];
	const joiner =
		{
			simple: ",",
			label: ".",
			matrix: ";",
			deepObject: "&",
			form: "&",
		}[options.style] || "&";

	// explode: false
	if (options.style !== "deepObject" && options.explode === false) {
		for (const k in value) {
			values.push(k, encodeURIComponent(value[k]!));
		}
		const final = values.join(","); // note: values are always joined by comma in explode: false (but joiner can prefix)
		switch (options.style) {
			case "form": {
				return `${name}=${final}`;
			}
			case "label": {
				return `.${final}`;
			}
			case "matrix": {
				return `;${name}=${final}`;
			}
			default: {
				return final;
			}
		}
	}

	// explode: true
	for (const k in value) {
		const finalName = options.style === "deepObject" ? `${name}[${k}]` : k;
		values.push(serializePrimitiveParam(finalName, value[k]!));
	}
	const final = values.join(joiner);
	return options.style === "label" || options.style === "matrix"
		? `${joiner}${final}`
		: final;
}

/**
 * Serialize array param (shallow only)
 * @type {import("./index.js").serializeArrayParam}
 */
function serializeArrayParam(
	name: string,
	value: unknown,
	options: {
		style:
			| "form"
			| "spaceDelimited"
			| "pipeDelimited"
			| "simple"
			| "label"
			| "matrix";
		explode: boolean;
	},
) {
	if (!Array.isArray(value)) {
		return "";
	}

	// explode: false
	if (options.explode === false) {
		const joiner =
			{
				form: ",",
				spaceDelimited: "%20",
				pipeDelimited: "|",
				label: ",",
				matrix: ",",
				simple: ",",
			}[options.style] || ","; // note: for arrays, joiners vary wildly based on style + explode behavior
		const final = value.map((v) => encodeURIComponent(v)).join(joiner);
		switch (options.style) {
			case "simple": {
				return final;
			}
			case "label": {
				return `.${final}`;
			}
			case "matrix": {
				return `;${name}=${final}`;
			}
			// case "spaceDelimited":
			// case "pipeDelimited":
			default: {
				return `${name}=${final}`;
			}
		}
	}

	// explode: true
	const joiner =
		{
			simple: ",",
			label: ".",
			matrix: ";",
			form: "&",
			spaceDelimited: "&",
			pipeDelimited: "&",
		}[options.style] || "&";
	const values = [];
	for (const v of value) {
		if (options.style === "simple" || options.style === "label") {
			values.push(encodeURIComponent(v));
		} else {
			values.push(serializePrimitiveParam(name, v));
		}
	}
	return options.style === "label" || options.style === "matrix"
		? `${joiner}${values.join(joiner)}`
		: values.join(joiner);
}

/**
 * Handle different OpenAPI 3.x serialization styles
 * @type {import("./index.js").defaultPathSerializer}
 * @see https://swagger.io/docs/specification/serialization/#path
 */
function defaultPathSerializer(
	pathname: string,
	pathParams: Record<string, string>,
) {
	let nextURL = pathname;
	for (const match of pathname.match(PATH_PARAM_RE) ?? []) {
		let name = match.substring(1, match.length - 1);
		let explode = false;
		let style: "simple" | "label" | "matrix" = "simple";
		if (name.endsWith("*")) {
			explode = true;
			name = name.substring(0, name.length - 1);
		}
		if (name.startsWith(".")) {
			style = "label";
			name = name.substring(1);
		} else if (name.startsWith(";")) {
			style = "matrix";
			name = name.substring(1);
		}
		if (
			!pathParams ||
			pathParams[name] === undefined ||
			pathParams[name] === null
		) {
			continue;
		}
		const value = pathParams[name];
		if (Array.isArray(value)) {
			nextURL = nextURL.replace(
				match,
				serializeArrayParam(name, value, { style, explode }),
			);
			continue;
		}
		if (typeof value === "object") {
			nextURL = nextURL.replace(
				match,
				serializeObjectParam(name, value, { style, explode }),
			);
			continue;
		}
		if (style === "matrix") {
			nextURL = nextURL.replace(
				match,
				`;${serializePrimitiveParam(name, value!)}`,
			);
			continue;
		}
		nextURL = nextURL.replace(
			match,
			style === "label"
				? `.${encodeURIComponent(value!)}`
				: encodeURIComponent(value!),
		);
	}
	return nextURL;
}

/**
 * Construct URL string from baseUrl and handle path and query params
 */
function createFinalURL(
	pathname: string,
	options: {
		baseUrl: string;
		params:
			| {
					path?: Record<string, string>;
			  }
			| undefined;
	},
) {
	let finalURL = `${options.baseUrl}${pathname}`;
	if (options.params?.path) {
		finalURL = defaultPathSerializer(finalURL, options.params.path);
	}
	return finalURL;
}

/**
 * Remove trailing slash from url
 * @type {import("./index.js").removeTrailingSlash}
 */
function removeTrailingSlash(url: string) {
	if (url.endsWith("/")) {
		return url.substring(0, url.length - 1);
	}
	return url;
}

/** Options for each client instance */
interface ClientOptions {
	/** set the common root URL for all API requests */
	baseUrl?: string;
}

type BodyType<T = unknown> = {
	json: T;
	text: Awaited<ReturnType<Response["text"]>>;
	blob: Awaited<ReturnType<Response["blob"]>>;
	arrayBuffer: Awaited<ReturnType<Response["arrayBuffer"]>>;
	stream: Response["body"];
};
type ParseAs = keyof BodyType;

interface DefaultParamsOption {
	params?: {
		query?: Record<string, unknown>;
	};
}

type ParamsOption<T> = T extends {
	parameters: any;
}
	? RequiredKeysOf<T["parameters"]> extends never
		? { params?: T["parameters"] }
		: { params: T["parameters"] }
	: DefaultParamsOption;

type RequestBodyOption<T> = OperationRequestBodyContent<T> extends never
	? { body?: never }
	: IsOperationRequestBodyOptional<T> extends true
		? { body?: OperationRequestBodyContent<T> }
		: { body: OperationRequestBodyContent<T> };

type FetchOptions<T> = RequestOptions<T>;

type RequestOptions<T> = ParamsOption<T> &
	RequestBodyOption<T> & {
		baseUrl?: string;
	};

/** This type helper makes the 2nd function param required if params/requestBody are required; otherwise, optional */
type MaybeOptionalInit<Params, Location extends keyof Params> = RequiredKeysOf<
	FetchOptions<FilterKeys<Params, Location>>
> extends never
	? FetchOptions<FilterKeys<Params, Location>> | undefined
	: FetchOptions<FilterKeys<Params, Location>>;

// The final init param to accept.
// - Determines if the param is optional or not.
// - Performs arbitrary [key: string] addition.
// Note: the addition MUST happen after all the inference happens (otherwise TS can’t infer if init is required or not).
type InitParam<Init> = RequiredKeysOf<Init> extends never
	? [(Init & { [key: string]: unknown })?]
	: [Init & { [key: string]: unknown }];

export type ReponseData<
	T extends Record<string | number, any>,
	Media extends MediaType = MediaType,
	K extends keyof T = keyof T,
> = T[K]["content"] extends Record<string, any>
	? FilterKeys<T[K]["content"], Media> extends never
		? T[K]["content"]
		: FilterKeys<T[K]["content"], Media>
	: K extends keyof T
		? T[K]["content"]
		: never;

export type ResponseWithStatus<
	T extends Record<string | number, any>,
	Media extends MediaType = MediaType,
	ResponseCode extends keyof T = keyof T,
> = {
	[K in ResponseCode]: {
		data: ReponseData<T, Media, K>;
		status: K;
	};
}[ResponseCode];

type ClientMethodEffect<
	Paths extends Record<string, Record<HttpMethod, {}>>,
	Method extends HttpMethod,
	Media extends MediaType,
> = <
	Path extends PathsWithMethod<Paths, Method>,
	Init extends MaybeOptionalInit<Paths[Path], Method>,
>(
	url: Path,
	...init: InitParam<Init>
) => Effect.Effect<
	ResponseWithStatus<ResponseObjectMap<Paths[Path][Method]>, Media>,
	HttpClientError,
	HttpClient.HttpClient
>;

export interface Client<Paths extends {}, Media extends MediaType = MediaType> {
	/** Call a GET endpoint */
	GET: ClientMethodEffect<Paths, "get", Media>;
	/** Call a PUT endpoint */
	PUT: ClientMethodEffect<Paths, "put", Media>;
	/** Call a POST endpoint */
	POST: ClientMethodEffect<Paths, "post", Media>;
	/** Call a DELETE endpoint */
	DELETE: ClientMethodEffect<Paths, "delete", Media>;
	/** Call a PATCH endpoint */
	PATCH: ClientMethodEffect<Paths, "patch", Media>;
}

class StatusError extends Data.TaggedError("StatusError")<{
	status: number;
	data: unknown;
}> {
	override get message() {
		return `HTTP ${this.status}: ${JSON.stringify(this.data)}`;
	}
}

interface AnyResponseWithStatus {
	data: any;
	status: number;
}
type ExtractDataByStatus<
	Res extends AnyResponseWithStatus,
	Status extends number,
> = Extract<Res, { status: Status }>["data"];

export const filterStatus =
	<Res extends AnyResponseWithStatus, const Status extends Res["status"]>(
		statusCodes: Status[],
	) =>
	(res: Res): Effect.Effect<ExtractDataByStatus<Res, Status>, StatusError> =>
		Effect.gen(function* () {
			if (!statusCodes.includes(res.status as Status))
				return yield* Effect.fail(
					new StatusError({
						status: res.status,
						data: res.data,
					}),
				);

			return res.data;
		});

export const filterStatusOk = <Res extends AnyResponseWithStatus>(
	res: Res,
): Effect.Effect<ExtractDataByStatus<Res, 200>, StatusError> =>
	filterStatus([200])(res);
