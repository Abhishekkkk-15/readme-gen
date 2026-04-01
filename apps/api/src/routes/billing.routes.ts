import { Router } from 'express';
import passport from 'passport';
import { cancelBilling, createCheckout, getBillingStatus, handleBillingWebhook } from '../controllers/billing.controller';

const router = Router();

router.post('/webhook', handleBillingWebhook);
router.post('/checkout', passport.authenticate('jwt', { session: false }), createCheckout);
router.get('/status', passport.authenticate('jwt', { session: false }), getBillingStatus);
router.post('/cancel', passport.authenticate('jwt', { session: false }), cancelBilling);

export default router;
