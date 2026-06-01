const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const getStatusColor = (status) => {
    switch (status) {
        case 'present':
            return { bg: '#d4edda', border: '#28a745', text: '#28a745', icon: '✓' };
        case 'late':
            return { bg: '#fff3cd', border: '#ffc107', text: '#b38600', icon: '⏰' };
        case 'absent':
            return { bg: '#f8d7da', border: '#dc3545', text: '#dc3545', icon: '✕' };
        default:
            return { bg: '#e2e3e5', border: '#6c757d', text: '#6c757d', icon: '?' };
    }
};

const sendAttendanceEmail = async (student, status, date, isTeacherVerified = false, teacherNotes = '') => {
    const statusStyle = getStatusColor(status);
    const formattedDate = new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let statusMessage = '';
    let emailSubject = '';
    
    if (isTeacherVerified && teacherNotes) {

        emailSubject = `ATTENDANCE VERIFICATION - ${student.first_name} ${student.last_name}`;
        statusMessage = `
            <tr>
                <td style="padding: 15px 30px; background-color: #fff3cd; border-top: 2px solid #ffc107;">
                    <p style="margin: 0; font-size: 14px; color: #856404; font-weight: 600;">
                        <i class="fas fa-exclamation-triangle"></i> TEACHER VERIFICATION: ${teacherNotes}
                    </p>
                </td>
            </tr>
        `;
    } else {
        emailSubject = `ATTENDANCE UPDATE - ${student.first_name} ${student.last_name}`;
    }
    
    const mailOptions = {
        from: `"PES Attendance System" <${process.env.EMAIL_USER}>`,
        to: student.parent_email || student.email,
        subject: emailSubject,
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #042212 0%, #0a3d25 50%, #0f5132 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">PES STUDENT</h1>
                            <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 12px;">ATTENDANCE SYSTEM</p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 25px 30px 10px 30px;">
                            <h2 style="color: #333333; margin: 0; font-size: 20px; font-weight: 600;">
                                Attendance ${isTeacherVerified ? 'Verification' : 'Notification'}
                            </h2>
                            <p style="color: #666666; margin: 8px 0 0 0; font-size: 14px;">
                                Here's the attendance update for ${student.first_name}.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding: 10px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 12px; padding: 20px;">
                                <tr>
                                    <td style="padding: 15px 0; border-bottom: 1px solid #e9ecef;">
                                        <strong style="color: #999999; font-size: 12px; text-transform: uppercase;">Student Name</strong>
                                        <p style="color: #333333; margin: 5px 0 0 0; font-size: 16px; font-weight: 600;">${student.first_name} ${student.last_name}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0; border-bottom: 1px solid #e9ecef;">
                                        <strong style="color: #999999; font-size: 12px; text-transform: uppercase;">Student ID</strong>
                                        <p style="color: #333333; margin: 5px 0 0 0; font-size: 14px;">${student.student_id}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0; border-bottom: 1px solid #e9ecef;">
                                        <strong style="color: #999999; font-size: 12px; text-transform: uppercase;">Class</strong>
                                        <p style="color: #333333; margin: 5px 0 0 0; font-size: 14px;">${student.class_}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 15px 0 0 0;">
                                        <strong style="color: #999999; font-size: 12px; text-transform: uppercase;">Date</strong>
                                        <p style="color: #333333; margin: 5px 0 0 0; font-size: 14px;">${formattedDate}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    ${statusMessage}

                    <tr>
                        <td style="padding: 20px 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <div style="display: inline-block; background-color: ${statusStyle.bg}; border: 2px solid ${statusStyle.border}; border-radius: 50px; padding: 15px 40px;">
                                            <span style="font-size: 24px; margin-right: 10px;">${statusStyle.icon}</span>
                                            <span style="color: ${statusStyle.text}; font-size: 18px; font-weight: 700; text-transform: uppercase;">
                                                ${status.toUpperCase()}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} PES STUDENT ATTENDANCE SYSTEM
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${student.parent_email || student.email}`);
        return true;
    } catch (error) {
        console.error('Email error:', error.message);
        return false;
    }
};

const sendApprovalEmail = async (student, status, date) => {
    return sendAttendanceEmail(student, status, date, true, 'APPROVED');
};

const sendRejectionEmail = async (student, newStatus, date, notes) => {
    return sendAttendanceEmail(student, newStatus, date, true, notes);
};

module.exports = { sendAttendanceEmail, sendApprovalEmail, sendRejectionEmail };