class ExportsHandler {
  constructor (exportService, playlistsService, validator) {
    this._exportService = exportService
    this._playlistsService = playlistsService
    this._validator = validator

    this.postExportPlaylistsHandler = this.postExportPlaylistsHandler.bind(this)
  }

  async postExportPlaylistsHandler (request, h) {
    this._validator.validateExportPlaylistsPayload(request.payload)

    const message = {
      userId: request.auth.credentials.id,
      targetEmail: request.payload.targetEmail,
      playlistId: request.params.playlistId
    }

    await this._playlistsService.verifyPlaylistOwner(message.playlistId, message.userId)
    await this._exportService.sendMessage('export:playlists', JSON.stringify(message))

    const response = h.response({
      status: 'success',
      message: 'Permintaan Anda dalam antrean'
    })
    response.code(201)
    return response
  }
}

module.exports = ExportsHandler
