ALTER TABLE "Product" ADD COLUMN "salePercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD CONSTRAINT "Product_salePercent_range" CHECK ("salePercent" BETWEEN 0 AND 90);
CREATE TABLE "Favorite" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
 "savedPrice" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Favorite_userId_productId_key" ON "Favorite"("userId","productId");
CREATE INDEX "Favorite_productId_idx" ON "Favorite"("productId");
CREATE TABLE "Review" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
 "orderId" TEXT NOT NULL REFERENCES "Order"("id"), "rating" INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
 "body" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Review_userId_productId_key" ON "Review"("userId","productId");
CREATE INDEX "Review_productId_createdAt_idx" ON "Review"("productId","createdAt");
CREATE TABLE "CustomerNotification" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "title" TEXT NOT NULL, "message" TEXT NOT NULL, "href" TEXT NOT NULL,
 "readAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CustomerNotification_userId_createdAt_idx" ON "CustomerNotification"("userId","createdAt");
CREATE TABLE "UndoAction" (
 "id" TEXT PRIMARY KEY, "actorId" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "entityId" TEXT NOT NULL, "before" TEXT NOT NULL, "after" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "UndoAction_actorId_expiresAt_idx" ON "UndoAction"("actorId","expiresAt");
-- Only the trusted server database role may access these tables.
ALTER TABLE "Favorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UndoAction" ENABLE ROW LEVEL SECURITY;
