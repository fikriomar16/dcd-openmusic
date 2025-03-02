/* eslint-disable no-underscore-dangle */
const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const { mapAlbumToModel } = require('../../utils');

class AlbumsService {
  /**
   * @param {import('../S3/StorageService.js')} storageS3Service
   * @param {import('../redis/CacheService.js')} cacheService
   */
  constructor(storageS3Service, cacheService) {
    this._pool = new Pool();
    this._storageS3Service = storageS3Service;
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO albums(id, name, year) VALUES($1, $2, $3) RETURNING id',
      values: [id, name, year],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Album gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getAlbums() {
    const result = await this._pool.query('SELECT * FROM albums');
    return result.rows.map(mapAlbumToModel);
  }

  async getAlbumById(id) {
    const query = {
      text: 'SELECT * FROM albums WHERE id = $1',
      values: [id],
    };
    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    const { createdAt, updatedAt, ...finalResult } = result.rows.map(mapAlbumToModel)[0];

    const songsQuery = {
      text: 'SELECT id,title,performer FROM songs WHERE "album_id" = $1',
      values: [finalResult.id],
    };
    const songsQueryResult = await this._pool.query(songsQuery);
    finalResult.songs = songsQueryResult.rows;

    return finalResult;
  }

  async editAlbumById(id, { name, year }) {
    const updatedAt = new Date().toISOString();
    const query = {
      text: 'UPDATE albums SET name = $1, year = $2, updated_at = $3 WHERE id = $4 RETURNING id',
      values: [name, year, updatedAt, id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Gagal memperbarui album. Id tidak ditemukan');
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: 'DELETE FROM albums WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Album gagal dihapus. Id tidak ditemukan');
    }
  }

  async updateCoverAlbumById(id, cover) {
    const coverUrl = await this._storageS3Service.writeFile(cover, cover.hapi);
    const updatedAt = new Date().toISOString();
    const query = {
      text: 'UPDATE albums SET cover = $1, updated_at = $2 WHERE id = $3 RETURNING id',
      values: [coverUrl, updatedAt, id],
    };
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError(
        'Gagal memperbarui cover album. Id tidak ditemukan',
      );
    }
  }

  async getAlbumLikesById(id) {
    try {
      const albumLikesCount = await this._cacheService.get(`album_likes:${id}`);
      return {
        source: 'cache',
        data: JSON.parse(albumLikesCount),
      };
    } catch (error) {
      const query = {
        text: 'SELECT * FROM user_album_likes WHERE album_id = $1',
        values: [id],
      };
      const { rowCount } = await this._pool.query(query);
      await this._cacheService.set(`album_likes:${id}`, rowCount, 1800);

      return {
        source: 'db',
        data: rowCount,
      };
    }
  }

  async _checkIfLikeIsExists(albumId, userId) {
    const { rowCount } = await this._pool.query({
      text: 'SELECT * FROM user_album_likes WHERE album_id = $1 AND user_id = $2',
      values: [albumId, userId],
    });
    return rowCount;
  }

  async likeAlbum(albumId, userId) {
    const id = `like-${nanoid(16)}`;
    if (await this._checkIfLikeIsExists(albumId, userId)) {
      throw new InvariantError(
        'Like gagal ditambahkan. Anda sudah menyukai album ini.',
      );
    }
    const query = {
      text: 'INSERT INTO user_album_likes VALUES($1, $2, $3) RETURNING id',
      values: [id, userId, albumId],
    };
    const { rowCount, rows } = await this._pool.query(query);
    if (!rowCount) {
      throw new InvariantError('Like gagal ditambahkan');
    }
    await this._cacheService.delete(`album_likes:${albumId}`);

    return rows[0].id;
  }

  async unlikeAlbum(albumId, userId) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE album_id = $1 AND user_id = $2 RETURNING id',
      values: [albumId, userId],
    };
    const { rowCount } = await this._pool.query(query);
    if (!rowCount) {
      throw new InvariantError('Like gagal dihapus');
    }
    await this._cacheService.delete(`album_likes:${albumId}`);
  }
}

module.exports = AlbumsService;
