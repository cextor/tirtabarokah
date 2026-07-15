<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

/**
 * Cross-Origin Resource Sharing (CORS) Configuration
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 */
class Cors extends BaseConfig
{
    /**
     * The default CORS configuration.
     *
     * @var array{
     *      allowedOrigins: list<string>,
     *      allowedOriginsPatterns: list<string>,
     *      supportsCredentials: bool,
     *      allowedHeaders: list<string>,
     *      exposedHeaders: list<string>,
     *      allowedMethods: list<string>,
     *      maxAge: int,
     *  }
     */
    public array $default = [
        /**
         * Origins for the `Access-Control-Allow-Origin` header.
         */
        'allowedOrigins' => ['*'],

        /**
         * Origin regex patterns for the `Access-Control-Allow-Origin` header.
         */
        'allowedOriginsPatterns' => [],

        /**
         * Weather to send the `Access-Control-Allow-Credentials` header.
         */
        'supportsCredentials' => false,

        /**
         * Set headers to allow.
         */
        'allowedHeaders' => ['*'],

        /**
         * Set headers to expose.
         */
        'exposedHeaders' => [],

        /**
         * Set methods to allow.
         */
        'allowedMethods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

        /**
         * Set how many seconds the results of a preflight request can be cached.
         */
        'maxAge' => 7200,
    ];
}
