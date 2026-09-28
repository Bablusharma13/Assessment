import { AppError } from './AppError.js';

// Loads a document by id and makes sure it belongs to the logged-in user.
// Used by every "one item" route, so the ownership rule lives in one place.
//   missing document       → 404
//   someone else's document → 403
export async function findOwnedResource(Model, id, userId, resourceName) {
  const resource = await Model.findById(id);

  if (!resource) {
    throw new AppError(`${resourceName} not found`, 404);
  }

  if (resource.userId.toString() !== userId) {
    throw new AppError(`You do not have access to this ${resourceName.toLowerCase()}`, 403);
  }

  return resource;
}
