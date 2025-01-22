import express from 'express';
import { ApolloServer, gql } from 'apollo-server-express';
import fetch from 'node-fetch';

const app = express();

// Define the GraphQL schema
const typeDefs = gql`
  type Pokemon {
    id: Int
    name: String
    height: Int
    weight: Int
    abilities: [Ability]
  }

  type Ability {
    name: String
  }

  type Query {
    getPokemon(nameOrId: String!): Pokemon
    listPokemon(limit: Int, offset: Int): [Pokemon]
    getPokemonByType(type: String!): [Pokemon]
  }
`;

// Resolvers to fetch data from PokeAPI
const resolvers = {
  Query: {
    async getPokemon(_, { nameOrId }) {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`);
      if (!response.ok) {
        throw new Error('Pokemon not found');
      }
      const data = await response.json();

      return {
        id: data.id,
        name: data.name,
        height: data.height,
        weight: data.weight,
        abilities: data.abilities.map((ability) => ({ name: ability.ability.name })),
      };
    },
    async listPokemon(_, { limit = 10, offset = 0 }) {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
      const data = await response.json();

      const promises = data.results.map(async (pokemon) => {
        const pokemonResponse = await fetch(pokemon.url);
        const pokemonData = await pokemonResponse.json();
        return {
          id: pokemonData.id,
          name: pokemonData.name,
          height: pokemonData.height,
          weight: pokemonData.weight,
          abilities: pokemonData.abilities.map((ability) => ({ name: ability.ability.name })),
        };
      });

      return Promise.all(promises);
    },
    async getPokemonByType(_, { type }) {
      const response = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
      if (!response.ok) {
        throw new Error('Type not found');
      }
      const data = await response.json();

      const promises = data.pokemon.map(async (pokemonEntry) => {
        const pokemonResponse = await fetch(pokemonEntry.pokemon.url);
        const pokemonData = await pokemonResponse.json();
        return {
          id: pokemonData.id,
          name: pokemonData.name,
          height: pokemonData.height,
          weight: pokemonData.weight,
          abilities: pokemonData.abilities.map((ability) => ({ name: ability.ability.name })),
        };
      });

      return Promise.all(promises);
    },
  },
};

// Create an Apollo Server instance
const server = new ApolloServer({ typeDefs, resolvers });

// Apply Apollo middleware to Express app
async function startServer() {
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer();
