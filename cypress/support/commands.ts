// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      logout(): Chainable<void>
      visitAsStudent(): Chainable<void>
      visitAsTeacher(): Chainable<void>
      visitAsAdmin(): Chainable<void>
      waitForAppLoad(): Chainable<void>
    }
  }
}

// Custom command for login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/auth/login')
    cy.get('[data-testid="email-input"]').type(email)
    cy.get('[data-testid="password-input"]').type(password)
    cy.get('[data-testid="login-button"]').click()
    cy.url().should('not.include', '/auth/login')
  })
})

// Custom command for logout
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click()
  cy.get('[data-testid="logout-button"]').click()
  cy.url().should('include', '/auth/login')
})

// Custom command to visit as different user roles
Cypress.Commands.add('visitAsStudent', () => {
  cy.login('student@test.com', 'password123')
  cy.visit('/student')
})

Cypress.Commands.add('visitAsTeacher', () => {
  cy.login('teacher@test.com', 'password123')
  cy.visit('/teacher')
})

Cypress.Commands.add('visitAsAdmin', () => {
  cy.login('admin@test.com', 'password123')
  cy.visit('/admin')
})

// Custom command to wait for app to fully load
Cypress.Commands.add('waitForAppLoad', () => {
  cy.get('[data-testid="app-ready"]').should('exist')
})

export {}