const roleContent = {
  admin: {
    title: 'Admin overview',
    body: 'Monitor school performance, approve teacher accounts, manage classes, and review reports in one place.'
  },
  teacher: {
    title: 'Teacher workspace',
    body: 'Create lessons, schedule assessments, track attendance, and share feedback quickly with students.'
  },
  student: {
    title: 'Student portal',
    body: 'Access homework, join quizzes, view exam schedules, and keep up with progress from one dashboard.'
  },
  parent: {
    title: 'Parent view',
    body: 'Receive announcements, check attendance, and review results without needing to visit school in person.'
  }
};

const buttons = document.querySelectorAll('.role-btn');
const panel = document.getElementById('role-panel');

function renderRole(role) {
  const item = roleContent[role];
  panel.innerHTML = `
    <h3>${item.title}</h3>
    <p>${item.body}</p>
  `;
}

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    buttons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    renderRole(button.dataset.role);
  });
});

renderRole('admin');
