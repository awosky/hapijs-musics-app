require('dotenv').config()
const Hapi = require('@hapi/hapi')
const ClientError = require('./exceptions/ClientError')
const Jwt = require('@hapi/jwt')
const Inert = require('@hapi/inert')
const path = require('path')

// musics
const musics = require('./api/musics')
const MusicsService = require('./services/postgres/MusicsService')
const MusicsValidator = require('./validator/musics')

// playlists
const playlists = require('./api/playlists')
const PlaylistsService = require('./services/postgres/PlaylistsService')
const PlaylistsValidator = require('./validator/playlists')

// playlistSongs
const playlistSongs = require('./api/playlistSongs')
const PlaylistSongsService = require('./services/postgres/PlaylistSongsService')
const PlaylistSongsValidator = require('./validator/PlaylistSongs')

// users
const users = require('./api/users')
const UsersService = require('./services/postgres/UsersService')
const UsersValidator = require('./validator/users')

// authentications
const authentications = require('./api/authentications')
const AuthenticationsService = require('./services/postgres/AuthenticationsService')
const TokenManager = require('./tokenize/TokenManager')
const AuthenticationsValidator = require('./validator/authentications')

// Exports
const _exports = require('./api/exports')
const ProducerService = require('./services/rabbitmq/ProducerService')
const ExportsValidator = require('./validator/exports')

// uploads
const uploads = require('./api/uploads')
const StorageService = require('./services/storage/StorageService')
const UploadsValidator = require('./validator/uploads')

// cache
const CacheService = require('./services/redis/CacheService')

const init = async () => {
  const cacheService = new CacheService()
  const musicsService = new MusicsService()
  const playlistsService = new PlaylistsService()
  const usersService = new UsersService()
  const authenticationsService = new AuthenticationsService()
  const playlistSongsService = new PlaylistSongsService(cacheService)
  const storageService = new StorageService(path.resolve(__dirname, 'api/uploads/file/images'))

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*']
      }
    }
  })

  await server.register([
    {
      plugin: Jwt
    },
    {
      plugin: Inert
    }
  ])

  server.auth.strategy('musicsapp_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id
      }
    })
  })

  await server.register([
    {
      plugin: musics,
      options: {
        service: musicsService,
        validator: MusicsValidator
      }
    },
    {
      plugin: playlists,
      options: {
        service: playlistsService,
        validator: PlaylistsValidator
      }
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator
      }
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator
      }
    },
    {
      plugin: playlistSongs,
      options: {
        playlistSongsService,
        playlistsService,
        validator: PlaylistSongsValidator
      }
    },
    {
      plugin: _exports,
      options: {
        exportService: ProducerService,
        playlistsService,
        validator: ExportsValidator
      }
    },
    {
      plugin: uploads,
      options: {
        service: storageService,
        validator: UploadsValidator
      }
    }
  ])

  server.ext('onPreResponse', (request, h) => {
    const { response } = request
    if (response instanceof Error && response.statusCode) {
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: 'fail',
          message: response.message
        })
        newResponse.code(response.statusCode)
        return newResponse
      }

      // Server ERROR!
      const newResponse = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.'
      })
      newResponse.code(response.statusCode)
      return newResponse
    }
    return response.continue || response
  })

  await server.start()
  console.log(`Server berjalan pada ${server.info.uri}`)
}

init()
