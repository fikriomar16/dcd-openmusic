/* eslint-disable no-underscore-dangle */

const autoBind = require('auto-bind');

class SongsHandler {
  /**
   * @param {import('../../services/postgres/SongService.js')} service SongService
   * @param {import('../../validator/songs/index.js')} validator Validator
   */
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postSongHandler(request, h) {
    const { payload } = request;
    this._validator.validateSongPayload(payload);
    const {
      title,
      year,
      genre,
      performer,
      duration = null,
      albumId = null,
    } = payload;
    const songId = await this._service.addSong({
      title,
      year,
      genre,
      performer,
      duration,
      albumId,
    });
    const response = h.response({
      status: 'success',
      message: 'Lagu berhasil ditambahkan',
      data: {
        songId,
      },
    });
    response.code(201);
    return response;
  }

  async getSongsHandler(request, h) {
    const { title = null, performer = null } = request.query;
    const songs = await this._service.getSongs({ title, performer });
    return h.response({
      status: 'success',
      data: {
        songs,
      },
    });
  }

  async getSongByIdHandler(request, h) {
    const { id } = request.params;
    const song = await this._service.getSongById(id);
    return h.response({
      status: 'success',
      data: {
        song,
      },
    });
  }

  async putSongByIdHandler(request, h) {
    this._validator.validateSongPayload(request.payload);
    const { id } = request.params;

    await this._service.editSongById(id, request.payload);
    return h.response({
      status: 'success',
      message: 'Lagu berhasil diperbarui',
    });
  }

  async deleteSongByIdHandler(request, h) {
    const { id } = request.params;
    await this._service.deleteSongById(id);

    return h.response({
      status: 'success',
      message: 'Lagu berhasil dihapus',
    });
  }
}
module.exports = SongsHandler;
