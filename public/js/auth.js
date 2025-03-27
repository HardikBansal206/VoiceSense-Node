// Validate email format
function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    return re.test(email);
  }
  
  // Validate password complexity
  function validatePassword(password) {
    // Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character
    const re =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;
    return re.test(password);
  }
  
  // Validate username format (4-16 alphanumeric characters)
  function validateUsername(username) {
    const re = /^[a-zA-Z0-9]{4,16}$/;
    return re.test(username);
  }
  
  // Handle login
  async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
  
    if (!username || !password) {
      alert('Please fill in all fields.');
      return;
    }
  
    try {
      // Disable button to prevent multiple submissions
      document.querySelector('.btn').disabled = true;
  
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        // Store token in localStorage after successful login
        localStorage.setItem('authToken', data.token);
        // Redirect to dashboard without alert
        window.location.href = 'http://localhost:8080/';
      } else {
        alert(data.error || 'Invalid username or password.');
      }
    } catch (error) {
      alert('Error during login. Please try again later.');
    } finally {
      // Re-enable button after API call
      document.querySelector('.btn').disabled = false;
    }
  }
  
  // Handle signup
  async function signup() {
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
  
    if (!username || !email || !password || !confirmPassword) {
      alert('Please fill in all fields.');
      return;
    }
  
    // Check username format
    if (!validateUsername(username)) {
      alert(
        'Username should be 4-16 characters long and contain only letters and numbers.'
      );
      return;
    }
  
    // Check email format
    if (!validateEmail(email)) {
      alert('Invalid email format.');
      return;
    }
  
    // Check password complexity
    if (!validatePassword(password)) {
      alert(
        'Password must be at least 8 characters long and include 1 uppercase, 1 lowercase, 1 number, and 1 special character.'
      );
      return;
    }
  
    // Check if passwords match
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
  
    try {
      // Disable button to prevent multiple submissions
      document.querySelector('.btn').disabled = true;
  
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        // Redirect to login page without alert
        window.location.href = 'login.html';
      } else {
        alert(data.error || 'Error during signup.');
      }
    } catch (error) {
      alert('Error during signup. Please try again later.');
    } finally {
      // Re-enable button after API call
      document.querySelector('.btn').disabled = false;
    }
  }
  