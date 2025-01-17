/**
 * @fileoverview Account Payment Settings
 */

import { useState, useEffect, useMemo } from 'react';
import { Elements, ElementsConsumer } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import Loading from '../../components/loading/loading.js';
import PaymentCustomPlan from '../../components/account/paymentCustomPlan.js/paymentCustomPlan.js';
import PaymentTable from '../../components/account/paymentTable.js/paymentTable.js';
import PaymentMethodCard from '../../components/account/paymentMethodCard/paymentMethodCard.js';
import AccountPlansModal from '../../components/accountPlansModal/accountPlansModal.js';
import AddPaymentMethodForm from '../../components/account/addPaymentMethodForm/addPaymentMethodForm.js';
import { earlyAdopterPlan, plans, plansEarly } from '../../components/contexts/plansContext';
import { userBillingSettings } from '../../lib/api';

/**
 * @typedef {object} storageSubscription
 * @property {'free'|'lite'|'pro'} price
 */

/**
 * @typedef {object} PaymentSettings
 * @property {null|{id: string}} paymentMethod
 * @property {object} subscription
 * @property {storageSubscription|null} subscription.storage
 */

/**
 * @typedef {Object} Plan
 * @property {string | null} id
 * @property {string} title
 * @property {string} description
 * @property {string} price
 * @property {string} baseStorage
 * @property {string} additionalStorage
 * @property {string} bandwidth
 * @property {string} blockLimit
 */

/**
 * @typedef {Object} PaymentMethodCard
 * @property {string} brand
 * @property {string} country
 * @property {string} exp_month
 * @property {string} exp_year
 * @property {string} last4
 */

/**
 * @typedef {Object} PaymentMethod
 * @property {string} id
 * @property {PaymentMethodCard} card
 */

const PaymentSettingsPage = props => {
  const [isPaymentPlanModalOpen, setIsPaymentPlanModalOpen] = useState(false);
  const stripePromise = loadStripe(props.stripePublishableKey);
  const [needsFetchPaymentSettings, setNeedsFetchPaymentSettings] = useState(true);
  const [, setIsFetchingPaymentSettings] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(/** @type {undefined|PaymentSettings} */ (undefined));
  const [planSelection, setPlanSelection] = useState('');
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(false);
  // subcomponents that save a new plan can set this, which will trigger a re-fetch but the
  // ui can optimistically show the new value while the refetch happens.
  const [optimisticCurrentPlan, setOptimisticCurrentPlan] = useState(/** @type {Plan|undefined} */ (undefined));
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // fetch payment settings whenever needed
  useEffect(() => {
    async function loadPaymentSettings() {
      if (!needsFetchPaymentSettings) {
        return;
      }
      setIsFetchingPaymentSettings(true);
      setNeedsFetchPaymentSettings(false);
      try {
        setPaymentSettings(await userBillingSettings());
        setOptimisticCurrentPlan(undefined); // no longer use previous optimistic value
      } finally {
        setIsFetchingPaymentSettings(false);
      }
    }
    loadPaymentSettings();
  }, [needsFetchPaymentSettings]);

  // When storageSubscription is null, user sees a version of planList that contains 'Early Adopter' instead of 'free'
  const planList = useMemo(() => {
    if (typeof paymentSettings === 'undefined') {
      return plans;
    }
    const storageSubscription = paymentSettings.subscription.storage;
    if (storageSubscription === null) {
      return plansEarly;
    }
    return plans;
  }, [paymentSettings]);

  // whenever the optimisticCurrentPlan is set, enqueue a fetch of actual payment settings
  useEffect(() => {
    if (optimisticCurrentPlan) {
      setNeedsFetchPaymentSettings(true);
    }
  }, [optimisticCurrentPlan]);

  const currentPlan = useMemo(() => {
    if (typeof optimisticCurrentPlan !== 'undefined') {
      return optimisticCurrentPlan;
    }
    if (typeof paymentSettings === 'undefined') {
      // haven't fetched paymentSettings yet.
      return undefined;
    }
    const storageSubscription = paymentSettings.subscription.storage;
    if (!storageSubscription) {
      // user has no storage subscription, show early adopter plan
      return earlyAdopterPlan;
    }
    return planList.find(plan => {
      return plan.id === storageSubscription.price;
    });
  }, [planList, paymentSettings, optimisticCurrentPlan]);

  const savedPaymentMethod = useMemo(() => {
    return paymentSettings?.paymentMethod;
  }, [paymentSettings]);

  return (
    <>
      <>
        <div className="page-container billing-container">
          <div className="">
            <h1 className="table-heading">Payment</h1>
          </div>
          <div className="billing-content">
            {currentPlan?.id === 'free' && !savedPaymentMethod && (
              <div className="add-billing-cta">
                <p>
                  You don&apos;t have a paid plan. Please add a credit/debit card and select a plan to prevent storage
                  issues beyond your plan limits below.
                </p>
              </div>
            )}

            {typeof paymentSettings === 'undefined' ? (
              <Loading message="Fetching user info..." />
            ) : (
              <PaymentTable
                plans={planList}
                currentPlan={currentPlan}
                setPlanSelection={setPlanSelection}
                setIsPaymentPlanModalOpen={setIsPaymentPlanModalOpen}
              />
            )}

            <div className="billing-settings-layout">
              <div>
                <h4>Payment Methods</h4>
                {savedPaymentMethod && !editingPaymentMethod ? (
                  <>
                    <PaymentMethodCard
                      savedPaymentMethod={savedPaymentMethod}
                      setEditingPaymentMethod={setEditingPaymentMethod}
                    />
                  </>
                ) : (
                  <div className="add-payment-method-cta">
                    <Elements stripe={stripePromise}>
                      <ElementsConsumer>
                        {({ stripe, elements }) => {
                          return (
                            <AddPaymentMethodForm
                              setHasPaymentMethods={() => setNeedsFetchPaymentSettings(true)}
                              setEditingPaymentMethod={setEditingPaymentMethod}
                              currentPlan={currentPlan?.id}
                            />
                          );
                        }}
                      </ElementsConsumer>
                    </Elements>
                  </div>
                )}
              </div>

              <div className="payment-history-layout">
                <h4>Enterprise user?</h4>
                <PaymentCustomPlan />
              </div>
            </div>
          </div>
        </div>
        <AccountPlansModal
          isOpen={isPaymentPlanModalOpen}
          onClose={() => {
            setIsPaymentPlanModalOpen(false);
            setHasAcceptedTerms(false);
          }}
          planList={planList}
          planSelection={planSelection}
          setCurrentPlan={setOptimisticCurrentPlan}
          savedPaymentMethod={savedPaymentMethod}
          stripePromise={stripePromise}
          setHasPaymentMethods={() => setNeedsFetchPaymentSettings(true)}
          setEditingPaymentMethod={setEditingPaymentMethod}
          setHasAcceptedTerms={setHasAcceptedTerms}
          hasAcceptedTerms={hasAcceptedTerms}
        />
      </>
    </>
  );
};

/**
 * @returns {{ props: import('components/types').PageAccountProps}}
 */
export function getStaticProps() {
  const STRIPE_PUBLISHABLE_KEY_ENVVAR_NAME = 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY';
  const stripePublishableKey = process.env[STRIPE_PUBLISHABLE_KEY_ENVVAR_NAME];
  if (!stripePublishableKey) {
    throw new Error(
      `account payment page requires truthy stripePublishableKey, but got ${stripePublishableKey}. Did you set env.${STRIPE_PUBLISHABLE_KEY_ENVVAR_NAME}?`
    );
  }
  return {
    props: {
      title: 'Payment',
      isRestricted: true,
      redirectTo: '/login/?redirect_uri=/account/payment',
      stripePublishableKey,
    },
  };
}

export default PaymentSettingsPage;
