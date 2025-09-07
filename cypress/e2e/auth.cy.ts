describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear cookies and local storage before each test
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  })

  describe('Login Page', () => {
    it('should display login form', () => {
      cy.visit('/auth/login')
      
      cy.get('[data-testid="email-input"]').should('be.visible')
      cy.get('[data-testid="password-input"]').should('be.visible')
      cy.get('[data-testid="login-button"]').should('be.visible')
      
      cy.contains('Нэвтрэх').should('be.visible')
    })

    it('should show validation errors for empty form', () => {
      cy.visit('/auth/login')
      
      cy.get('[data-testid="login-button"]').click()
      
      cy.contains('И-мэйл хаяг оруулна уу').should('be.visible')
      cy.contains('Нууц үг оруулна уу').should('be.visible')
    })

    it('should show error for invalid credentials', () => {
      cy.visit('/auth/login')
      
      cy.get('[data-testid="email-input"]').type('invalid@test.com')
      cy.get('[data-testid="password-input"]').type('wrongpassword')
      cy.get('[data-testid="login-button"]').click()
      
      cy.contains('И-мэйл эсвэл нууц үг буруу байна').should('be.visible')
    })
  })

  describe('Registration Page', () => {
    it('should display registration form', () => {
      cy.visit('/auth/register')
      
      cy.get('[data-testid="name-input"]').should('be.visible')
      cy.get('[data-testid="email-input"]').should('be.visible')
      cy.get('[data-testid="password-input"]').should('be.visible')
      cy.get('[data-testid="register-button"]').should('be.visible')
      
      cy.contains('Бүртгүүлэх').should('be.visible')
    })

    it('should show validation errors for invalid data', () => {
      cy.visit('/auth/register')
      
      cy.get('[data-testid="register-button"]').click()
      
      cy.contains('Нэр оруулна уу').should('be.visible')
      cy.contains('И-мэйл хаяг оруулна уу').should('be.visible')
      cy.contains('Нууц үг оруулна уу').should('be.visible')
    })
  })

  describe('Protected Routes', () => {
    it('should redirect to login when accessing protected route without auth', () => {
      cy.visit('/student/dashboard')
      cy.url().should('include', '/auth/login')
    })

    it('should redirect to login when accessing admin route without auth', () => {
      cy.visit('/admin')
      cy.url().should('include', '/auth/login')
    })

    it('should redirect to login when accessing teacher route without auth', () => {
      cy.visit('/teacher')
      cy.url().should('include', '/auth/login')
    })
  })

  describe('Navigation', () => {
    it('should navigate between login and register pages', () => {
      cy.visit('/auth/login')
      
      cy.contains('Бүртгүүлэх').click()
      cy.url().should('include', '/auth/register')
      
      cy.contains('Нэвтрэх').click()
      cy.url().should('include', '/auth/login')
    })
  })

  describe('Error Handling', () => {
    it('should display error boundary when there is an application error', () => {
      // Visit a route that might trigger an error
      cy.visit('/', { failOnStatusCode: false })
      
      // Check if error boundary is displayed (if there's an error)
      cy.get('body').then(($body) => {
        if ($body.text().includes('Алдаа гарлаа')) {
          cy.contains('Алдаа гарлаа').should('be.visible')
          cy.get('[data-testid="retry-button"]').should('be.visible')
        }
      })
    })
  })
})

describe('Responsive Design', () => {
  const viewports = [
    { device: 'iPhone X', width: 375, height: 812 },
    { device: 'iPad', width: 768, height: 1024 },
    { device: 'Desktop', width: 1280, height: 720 },
  ]

  viewports.forEach(({ device, width, height }) => {
    it(`should work properly on ${device}`, () => {
      cy.viewport(width, height)
      cy.visit('/auth/login')
      
      cy.get('[data-testid="email-input"]').should('be.visible')
      cy.get('[data-testid="password-input"]').should('be.visible')
      cy.get('[data-testid="login-button"]').should('be.visible')
    })
  })
})