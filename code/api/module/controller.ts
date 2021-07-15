import { NextFunction, Request, Response } from 'express'

/**
 * Return all entities
 * @param req
 * @param res
 * @param next
 */
export async function index(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  //
}

/**
 * Return one instance of entity
 * @param req
 * @param res
 * @param next
 */
export async function show(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { id } = req.params
}

/**
 * Save an entity
 * @param req
 * @param res
 * @param next
 */
export async function store(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  //
}

/**
 * Update an entity
 * @param req
 * @param res
 * @param next
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { id } = req.params
}

/**
 * Destroy one instance of an entity
 * @param req
 * @param res
 * @param next
 */
export async function destroy(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { id } = req.params
}
