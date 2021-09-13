class PlaylistSongsHandler {
  constructor (playlistSongsService, playlistsService, validator) {
    this._playlistSongsService = playlistSongsService
    this._playlistsService = playlistsService
    this._validator = validator

    this.postPlaylistSongHandler = this.postPlaylistSongHandler.bind(this)
    this.getPlaylistSongsHandler = this.getPlaylistSongsHandler.bind(this)
    this.deletePlaylistSongHandler = this.deletePlaylistSongHandler.bind(this)
  }

  async postPlaylistSongHandler (request, h) {
    this._validator.validatePlaylistSongPayload(request.payload)
    const { id: credentialId } = request.auth.credentials
    const { playlistId } = request.params
    const { songId } = request.payload

    await this._playlistsService.verifyPlaylistOwner(playlistId, credentialId)
    const playlistSongId = await this._playlistSongsService.addPlaylistSong(songId, playlistId)

    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan ke playlist',
      data: {
        playlistSongId
      }
    })
    response.code(201)
    return response
  }

  async getPlaylistSongsHandler (request, h) {
    const { id: credentialId } = request.auth.credentials
    const { playlistId } = request.params
    await this._playlistsService.verifyPlaylistOwner(playlistId, credentialId)
    const songs = await this._playlistSongsService.getPlaylistSongs(playlistId)
    return {
      status: 'success',
      data: {
        songs
      }
    }
  }

  async deletePlaylistSongHandler (request, h) {
    this._validator.validatePlaylistSongPayload(request.payload)
    const { id: credentialId } = request.auth.credentials
    const { playlistId } = request.params
    const { songId } = request.payload

    await this._playlistsService.verifyPlaylistOwner(playlistId, credentialId)
    await this._playlistSongsService.deletePlaylistSong(songId, playlistId)

    return {
      status: 'success',
      message: 'Lagu berhasil dihapus dari playlist'
    }
  }
}

module.exports = PlaylistSongsHandler
