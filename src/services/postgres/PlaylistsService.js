/* eslint-disable no-underscore-dangle */
const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const { mapSongToModel } = require('../../utils');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsService {
  /**
   * @param {import('./CollaborationsService.js')} collaborationsService
   */
  constructor(collaborationsService) {
    this._pool = new Pool();
    this._collaborationsService = collaborationsService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [id, name, owner, createdAt, updatedAt],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }
    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username 
      FROM playlists 
      LEFT JOIN users ON playlists.owner = users.id 
      LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
      WHERE playlists.owner = $1 OR collaborations.user_id = $1`,
      values: [owner],
    };
    const result = await this._pool.query(query);
    return result.rows;
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);
    await this._pool.query({
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 RETURNING id',
      values: [id],
    });
    if (!result.rowCount) {
      throw new NotFoundError('Catatan gagal dihapus. Id tidak ditemukan');
    }
  }

  async _checkSongIdIfExists(songId) {
    const result = await this._pool.query({
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [songId],
    });
    return result.rowCount;
  }

  async addSongToPlaylist(playlistId, songId, userId) {
    if (!await this._checkSongIdIfExists(songId)) {
      throw new NotFoundError('Lagu tidak ditemukan');
    }
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const query = {
      text: 'INSERT INTO playlist_songs VALUES($1, $2, $3, $4, $5) RETURNING id',
      values: [id, playlistId, songId, createdAt, updatedAt],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan');
    }
    await this._recordActivities({
      playlistId, songId, userId, action: 'add',
    });
    return result.rows[0].id;
  }

  async getPlaylistSongsById(playlistId) {
    const playlistQuery = {
      text: `SELECT playlists.id, playlists.name, users.username 
      FROM playlists 
      LEFT JOIN users ON playlists.owner = users.id
      WHERE playlists.id = $1
      `,
      values: [playlistId],
    };
    const playlistResult = await this._pool.query(playlistQuery);
    const playlist = playlistResult.rows[0];
    const query = {
      text: 'SELECT songs.id, songs.title, songs.performer FROM playlist_songs INNER JOIN songs ON playlist_songs.song_id = songs.id WHERE playlist_songs.playlist_id = $1',
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    const songs = result.rows.map(mapSongToModel);
    playlist.songs = songs;
    return playlist;
  }

  async deleteSongFromPlaylist(playlistId, songId, userId) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      values: [playlistId, songId],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Lagu gagal dihapus. Id tidak ditemukan');
    }
    await this._recordActivities({
      playlistId, songId, userId, action: 'delete',
    });
  }

  async verifyPlaylistOwner(playlistId, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [playlistId],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Resource yang Anda minta tidak ditemukan');
    }
    const playlist = result.rows[0];
    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      console.error(error);
    }
    try {
      await this.verifyCanCollaborate(playlistId, userId);
    } catch (err) {
      console.error(err);
    }
  }

  async verifyCanCollaborate(playlistId, userId) {
    const query = {
      text: `SELECT playlists.owner, collaborations.user_id, collaborations.playlist_id
      FROM collaborations 
      LEFT JOIN playlists ON collaborations.playlist_id = playlists.id
      WHERE (playlists.owner = $1 OR collaborations.user_id = $1) AND playlists.id = $2`,
      values: [userId, playlistId],
    };
    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini.');
    }
  }

  async _recordActivities({
    playlistId, songId, userId, action,
  }) {
    const id = nanoid(16);
    await this._pool.query({
      text: 'INSERT INTO playlist_song_activities VALUES($1, $2, $3, $4, $5)',
      values: [id, playlistId, songId, userId, action],
    });
  }

  async getActivities(playlistId, userId) {
    const query = {
      text: `SELECT users.username as username, songs.title as title, playlist_song_activities.action, playlist_song_activities.time
      FROM playlist_song_activities
      INNER JOIN playlists ON playlist_song_activities.playlist_id = playlists.id
      INNER JOIN songs ON playlist_song_activities.song_id = songs.id
      LEFT JOIN users ON playlists.owner = users.id 
      LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
      WHERE playlists.id = $1 AND (playlists.owner = $2 OR collaborations.user_id = $2)
      `,
      values: [playlistId, userId],
    };
    const result = await this._pool.query(query);
    return {
      playlistId,
      activities: result.rows,
    };
  }
}

module.exports = PlaylistsService;
