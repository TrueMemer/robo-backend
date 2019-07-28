import { Controller, Post } from "@overnightjs/core";
import { IsNotEmpty, IsEmail, validate } from "class-validator";
import { Request, Response } from "express";
import { createTransport } from "nodemailer";
import config from "../config/config";

import { MailOptions } from "nodemailer/lib/smtp-transport";


class MailFormDto {

	@IsNotEmpty()
	name: string;

	@IsEmail()
	@IsNotEmpty()
	from: string;

	@IsNotEmpty()
	subject: string;

	@IsNotEmpty()
	message: string;

}

@Controller("api/mail")
export class MailController {

	@Post("")
	private async sendForm(req: Request, res: Response) {

		const form = req.body;

		const errors = await validate(form, { validateMissingProperties: true });
		if (errors.length > 0) {
			return res.status(400).send(errors);
		}

		const transport = createTransport({
			host: "smtp.yandex.ru",
            port: 465,
            auth: {
                user: config.mail.username,
                pass: config.mail.password
            }
		});

	    const mailOptions: MailOptions = {
	        from: config.mail.username,
	        to: config.mail.username,
	        subject: `${form.subject} from ${form.from}`,
	        text: form.message,
	        

    	}

    	transport.sendMail(mailOptions);

    	return res.send();
	}

}