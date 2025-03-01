/* eslint-disable no-underscore-dangle */

const autoBind = require('auto-bind');

class AlbumsHandler {
  /**
   * @param {import('../../services/postgres/AlbumsService.js')} service AlbumsService
   * @param {import('../../validator/albums/index.js')} validator Validator
   */
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    autoBind(this);
  }

  async postAlbumHandler(request, h) {
    const { payload } = request;
    this._validator.validateAlbumPayload(payload);
    const { name, year } = payload;
    const albumId = await this._service.addAlbum({ name, year });
    const response = h.response({
      status: 'success',
      message: 'Album berhasil ditambahkan',
      data: {
        albumId,
      },
    });
    response.code(201);
    return response;
  }

  async getAlbumByIdHandler(request, h) {
    const { id } = request.params;
    const album = await this._service.getAlbumById(id);
    return h.response({
      status: 'success',
      data: {
        album,
      },
    });
  }

  async putAlbumByIdHandler(request, h) {
    this._validator.validateAlbumPayload(request.payload);
    const { id } = request.params;

    await this._service.editAlbumById(id, request.payload);

    return h.response({
      status: 'success',
      message: 'Album berhasil diperbarui',
    });
  }

  async deleteAlbumByIdHandler(request, h) {
    const { id } = request.params;
    await this._service.deleteAlbumById(id);

    return h.response({
      status: 'success',
      message: 'Album berhasil dihapus',
    });
  }

  async uploadCoverAlbumHandler(request, h) {
    const { cover } = request.payload;
    const { id } = request.params;
    this._validator.validateCoverAlbumImageHeaders(cover.hapi.headers);
    await this._service.getAlbumById(id);
    await this._service.updateCoverAlbumById(id, cover);

    const response = h.response({
      status: 'success',
      message: 'Sampul berhasil diunggah',
    });
    response.code(201);
    return response;
  }

  async getAlbumLikesByIdHandler(request, h) {
    const { id } = request.params;
    const { data, source } = await this._service.getAlbumLikesById(id);
    const response = h.response({
      status: 'success',
      data: {
        likes: data,
      },
    });
    if (source === 'cache') response.header('X-Data-Source', 'cache');
    return response;
  }

  async likeAlbumHandler(request, h) {
    const { id: credentialId } = request.auth.credentials;
    const { id: albumId } = request.params;
    await this._service.getAlbumById(albumId);

    const likeId = await this._service.likeAlbum(albumId, credentialId);
    const response = h.response({
      status: 'success',
      message: 'Like berhasil ditambahkan',
      data: {
        likeId,
      },
    });
    response.code(201);
    return response;
  }

  async unlikeAlbumHandler(request, h) {
    const { id: credentialId } = request.auth.credentials;
    const { id: albumId } = request.params;

    await this._service.unlikeAlbum(albumId, credentialId);
    return h.response({
      status: 'success',
      message: 'Like berhasil dibatalkan',
    });
  }
}
module.exports = AlbumsHandler;
