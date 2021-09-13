const { Pool } = require('pg')
const { nanoid } = require('nanoid')
const InvariantError = require('../../exceptions/InvariantError')

class PlaylistSongsService {
  constructor (cacheService) {
    this._pool = new Pool()
    this._cacheService = cacheService
  }

  async addPlaylistSong (songId, playlistId) {
    const id = `playlistSongs-${nanoid(16)}`

    const query = {
      text: 'INSERT INTO playlistSongs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId]
    }

    const result = await this._pool.query(query)

    if (!result.rowCount) {
      throw new InvariantError('Lagu gagal ditambahkan ke Playlist')
    }

    await this._cacheService.delete(`playlist:${playlistId}`)
    return result.rows[0].id
  }

  async getPlaylistSongs (playlistId) {
    try {
      const result = await this._cacheService.get(`playlist:${playlistId}`)
      return JSON.parse(result)
    } catch (error) {
      const query = {
        text: `SELECT musics.id, musics.title, musics.performer FROM playlistsongs
        LEFT JOIN musics ON musics.id = playlistsongs.song_id
        WHERE playlistsongs.playlist_id = $1`,
        values: [playlistId]
      }
      const result = await this._pool.query(query)
      await this._cacheService.set(`playlist:${playlistId}`, JSON.stringify(result.rows))
      return result.rows
    }
  }

  async deletePlaylistSong (songId, playlistId) {
    const query = {
      text: 'DELETE FROM playlistSongs WHERE song_id = $1 AND playlist_id = $2 RETURNING id',
      values: [songId, playlistId]
    }

    const result = await this._pool.query(query)

    if (!result.rowCount) {
      throw new InvariantError('Lagu gagal dihapus di Playlist')
    }

    await this._cacheService.delete(`playlist:${playlistId}`)
  }

  async verifyCollaborator (songId, playlistId) {
    const query = {
      text: 'SELECT * FROM playlistSongs WHERE song_id = $1 AND playlist_id = $2',
      values: [songId, playlistId]
    }

    const result = await this._pool.query(query)

    if (!result.rowCount) {
      throw new InvariantError('Lagu gagal diverifikasi')
    }
  }
}

module.exports = PlaylistSongsService
