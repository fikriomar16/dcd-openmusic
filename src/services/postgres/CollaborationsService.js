/* eslint-disable no-underscore-dangle */
const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');

class CollaborationsService {
  constructor() {
    this._pool = new Pool();
  }

  async _checkIfuserIdIsExists(userId) {
    const result = await this._pool.query({
      text: 'SELECT * FROM users WHERE id = $1',
      values: [userId],
    });
    return result.rowCount;
  }

  async _checkIfPlaylistIsExists(playlistId) {
    const result = await this._pool.query({
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [playlistId],
    });
    return result.rowCount;
  }

  async _checkIfCollaborationIsExists(playlistId, userId) {
    const result = await this._pool.query({
      text: 'SELECT * FROM collaborations WHERE playlist_id = $1 AND user_id = $2',
      values: [playlistId, userId],
    });
    return result;
  }

  async addCollaboration(playlistId, userId) {
    if (!await this._checkIfuserIdIsExists(userId)) {
      throw new NotFoundError('User tidak ditemukan');
    }
    if (!await this._checkIfPlaylistIsExists(playlistId)) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
    const checkIfAlreadyExist = await this._checkIfCollaborationIsExists(playlistId, userId);
    if (checkIfAlreadyExist.rowCount) {
      return checkIfAlreadyExist.rows[0].id;
    }
    const id = `collab-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO collaborations VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, userId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Kolaborasi gagal ditambahkan');
    }
    return result.rows[0].id;
  }

  async deleteCollaboration(playlistId, userId) {
    const query = {
      text: 'DELETE FROM collaborations WHERE playlist_id = $1 AND user_id = $2 RETURNING id',
      values: [playlistId, userId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Kolaborasi gagal dihapus');
    }
  }

  async verifyCollaborator(playlistId, userId) {
    const query = {
      text: 'SELECT * FROM collaborations WHERE playlist_id = $1 AND user_id = $2',
      values: [playlistId, userId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new InvariantError('Kolaborasi gagal diverifikasi');
    }
  }
}

module.exports = CollaborationsService;
