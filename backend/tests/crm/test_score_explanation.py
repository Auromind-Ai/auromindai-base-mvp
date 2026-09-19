"""Database-free regression checks for the CRM scoring explanation contract.

Run from backend: python -m unittest discover -s tests/crm -p test_score_explanation.py
"""
import unittest
from unittest.mock import patch

from app.schemas.lead_scoring import ScoreBreakdown
from app.services.crm.lead_scoring_service import calculate_score_breakdown
from app.utils.scoring_config import get_scoring_config


class ScoreExplanationTests(unittest.TestCase):
    def breakdown(self, signals):
        return calculate_score_breakdown(
            current_node=0, total_nodes=0, days_inactive=0,
            template_responses=[], intent_signals=signals,
        )

    def test_buying_intents_survive_response_serialization(self):
        keys = ['pricing_intent', 'payment_intent', 'budget_acceptance']
        result = ScoreBreakdown.model_validate(self.breakdown({
            key: {'value': True, 'snippet': 'customer evidence', 'reasoning': 'detected intent'}
            for key in keys
        })).model_dump()
        self.assertIn(result['lead_tier'], ['hot', 'warm', 'cold'])
        for key in keys:
            signal = result['intent']['signals'][key]
            self.assertTrue(signal['value'])
            self.assertEqual(signal['snippet'], 'customer evidence')
            self.assertEqual(signal['reasoning'], 'detected intent')
            self.assertEqual(signal['weight'], get_scoring_config().get_weights()[key])

    def test_changed_weights_and_new_signals_use_configuration(self):
        config = get_scoring_config()
        with patch.object(config, 'get_weights', return_value={'pricing_intent': 37, 'new_intent': -7}):
            result = self.breakdown({'pricing_intent': True, 'new_intent': True})
        self.assertEqual(result['intent']['signals']['pricing_intent']['weight'], 37)
        self.assertTrue(result['intent']['signals']['new_intent']['value'])
        self.assertEqual(result['intent']['signals']['new_intent']['weight'], -7)

    def test_configured_tier_survives_response_serialization(self):
        with patch.object(get_scoring_config(), 'get_tier', return_value='hot'):
            result = ScoreBreakdown.model_validate(self.breakdown({})).model_dump()
        self.assertEqual(result['lead_tier'], 'hot')


if __name__ == '__main__':
    unittest.main()
