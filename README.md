# GraphQL APQ

[Automatic persisted queries](https://www.apollographql.com/docs/apollo-server/features/apq) made easy.

[![build status](https://img.shields.io/travis/lucasconstantino/graphql-apq/master.svg?style=flat-square)](https://travis-ci.org/lucasconstantino/graphql-apq)
[![coverage](https://img.shields.io/codecov/c/github/lucasconstantino/graphql-apq.svg?style=flat-square)](https://codecov.io/github/lucasconstantino/graphql-apq)
[![npm version](https://img.shields.io/npm/v/graphql-apq.svg?style=flat-square)](https://www.npmjs.com/package/graphql-apq)
[![sponsored by Taller](https://raw.githubusercontent.com/TallerWebSolutions/tallerwebsolutions.github.io/master/sponsored-by-taller.png)](https://taller.net.br/en/)

---

This library consists of a server-side implementation of the [persisted queries protocol](https://github.com/apollographql/apollo-link-persisted-queries#protocol) as presented by the [Apollo Engine](https://www.apollographql.com/engine) team.

Apollo Engine is a paid GraphQL gateway with many wonderful tools, and this project brings to the open-source world one of those tools.

Persisted queries was [first brought up](https://dev-blog.apollodata.com/persisted-graphql-queries-with-apollo-client-119fd7e6bba5) by the Apollo team, but relied mostly on complicated building process to achieve the full benefit proposed. Automatic persisted queries is a concept built on top of that idea, which allows for persisted queries to be registered in run-time.

### How it works

1.  When the client makes a query, it will optimistically send a short (64-byte) cryptographic hash instead of the full query text.
1.  If the backend recognizes the hash, it will retrieve the full text of the query and execute it.
1.  If the backend doesn't recogize the hash, it will ask the client to send the hash and the query text to it can store them mapped together for future lookups. During this request, the backend will also fulfill the data request.

This library is a server implementation for use with any GraphQL server.

You can use any client-side implementation, as long as it follows the same protocol, but we strongly recommend using the [apollo-link-persisted-queries](https://github.com/apollographql/apollo-link-persisted-queries) project.

## Installation

```
npm install graphql-apq --save
```

## Usage

This project currently provides a core system for handling persisted queries and an `express` middleware to integrate it to a GraphQL server of choice. It will eventually also provide an `extension` to the Apollo Server project, as soon as [extensions are implemented](https://github.com/apollographql/apollo-server/pull/1105) in that project.

### Middleware

```js
import persistedQueries from 'graphql-apq/lib/express'
import express from 'express'
import bodyParser from 'body-parser'
import { graphqlExpress } from 'apollo-server-express'

const schema = // ... define or import your schema here!
const PORT = 3000;

const app = express();

app
  .use('/graphql', bodyParser.json(), persistedQueries(), graphqlExpress({ schema }))
  .listen(PORT)
```

#### Options

You can alter some of APQ's default behavior by providing an object of
options to the middleware initialization as follows:

##### `cache`

A cache object implementing `get`, `put`, and `keys` methods. Defaults
to an instance of [`memory-cache`](https://github.com/ptarjan/node-cache).
Can be modified to provide a more specialized caching system with cache
cleaning, for instance.

##### `resolveHash`

A reducer from an operation to the hash to use. Defaults to retrieving the
hash from `operation.extensions.persistedQuery.sha256Hash`.
