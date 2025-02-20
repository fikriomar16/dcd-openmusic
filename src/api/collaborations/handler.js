const autoBind = require('auto-bind');

/* eslint-disable no-underscore-dangle */
class CollaborationsHandler {
  /**
   * @param {import('../../services/postgres/CollaborationsService.js')} service
   * @param {import('../../services/postgres/PlaylistsService.js')} playlistsService
   * @param {import('../../validator/collaborations')} validator
   */
  constructor(service, playlistsService, validator) {
    this._service = service;
    this._playlistsService = playlistsService;
    this._validator = validator;

    autoBind(this);
  }

  async postCollaborationHandler(request, h) {
    this._validator.validateCollaborationPayload(request.payload);
    const { id: credentialId } = request.auth.credentials;
    const { playlistId, userId } = request.payload;
    this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);
    const collaborationId = await this._service.addCollaboration(playlistId, userId);

    const response = h.response({
      status: 'success',
      message: 'Kolaborasi berhasil ditambahkan',
      data: {
        collaborationId,
      },
    });
    response.code(201);
    return response;
  }

  async deleteCollaborationHandler(request, h) {
    this._validator.validateCollaborationPayload(request.payload);
    const { id: credentialId } = request.auth.credentials;
    const { playlistId, userId } = request.payload;
    this._playlistsService.verifyPlaylistOwner(playlistId, credentialId);
    await this._service.deleteCollaboration(playlistId, userId);
    return h.response({
      status: 'success',
      message: 'Kolaborasi berhasil dihapus',
    });
  }
}

module.exports = CollaborationsHandler;
