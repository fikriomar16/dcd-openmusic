require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');

const AlbumsService = require('./services/postgres/AlbumsService');
const SongService = require('./services/postgres/SongService');
const UsersService = require('./services/postgres/UsersService');
const AuthenticationsService = require('./services/postgres/AuthenticationsService');
const PlaylistsService = require('./services/postgres/PlaylistsService');
const CollaborationsService = require('./services/postgres/CollaborationsService');

const albums = require('./api/albums');
const AlbumsValidator = require('./validator/albums');
const songs = require('./api/songs');
const SongsValidator = require('./validator/songs');
const users = require('./api/users');
const UsersValidator = require('./validator/users');
const authentications = require('./api/authentications');
const AuthenticationsValidator = require('./validator/authentications');
const TokenManager = require('./tokenize/TokenManager');
const playlists = require('./api/playlists');
const PlaylistsValidator = require('./validator/playlists');
const collaborations = require('./api/collaborations');
const CollaborationsValidator = require('./validator/collaborations');

const ClientError = require('./exceptions/ClientError');
const ServerError = require('./exceptions/ServerError');
const config = require('./utils/config');

const init = async () => {
  const albumService = new AlbumsService();
  const songService = new SongService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const collaborationsService = new CollaborationsService();
  const playlistsService = new PlaylistsService();

  const server = Hapi.server({
    host: config.app.host,
    port: config.app.port,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  // registrasi plugin eksternal
  await server.register([
    {
      plugin: Jwt,
    },
  ]);
  // mendefinisikan strategy autentikasi jwt
  server.auth.strategy('openmusicapi_jwt', 'jwt', {
    keys: config.jwt.accessTokenKey,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: config.jwt.accessTokenAge,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register([
    {
      plugin: albums,
      options: {
        service: albumService,
        validator: AlbumsValidator,
      },
    },
    {
      plugin: songs,
      options: {
        service: songService,
        validator: SongsValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        service: authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        service: playlistsService,
        validator: PlaylistsValidator,
      },
    },
    {
      plugin: collaborations,
      options: {
        service: collaborationsService,
        playlistsService,
        validator: CollaborationsValidator,
      },
    },
  ]);

  // prettier-ignore
  server.ext('onPreResponse', (request, h) => { // NOSONAR
    const { response } = request;
    if (response instanceof Error) {
      if (response instanceof ClientError || response instanceof ServerError) {
        const newResponse = h.response({
          status: response.status,
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }
      if (!response.isServer) {
        return h.continue;
      }
      console.log({ payload: request.payload, response: request.response });
      const newResponse = h.response({
        status: 'error',
        message: 'terjadi kegagalan pada server kami',
      });
      newResponse.code(500);
      return newResponse;
    }
    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};
init();
