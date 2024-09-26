from flask import Flask, request, jsonify
from models import db, Cliente
from email_validator import validate_email, EmailNotValidError
import random
import string
import smtplib

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/cadastro', methods=['POST'])
def cadastro():
    data = request.json

    try:
        # Validação dos dados
        nome_completo = data['nome_completo']
        cpf_cnpj = data['cpf_cnpj']
        email = data['email']
        numero_celular = data['numero_celular']

        # Validação do email
        valid = validate_email(email)
        email = valid.email
        
        # Verificar se o cliente já existe
        cliente_existente = Cliente.query.filter_by(cpf_cnpj=cpf_cnpj).first()
        if cliente_existente:
            return jsonify({'message': 'Cliente já cadastrado.'}), 400
        
        # Gerar código de confirmação
        codigo_confirmacao = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

        # Criar novo cliente
        novo_cliente = Cliente(
            nome_completo=nome_completo,
            cpf_cnpj=cpf_cnpj,
            email=email,
            numero_celular=numero_celular,
            codigo_confirmacao=codigo_confirmacao
        )

        db.session.add(novo_cliente)
        db.session.commit()

        # Enviar código de confirmação por email
        enviar_email_confirmacao(email, codigo_confirmacao)

        return jsonify({'message': 'Cadastro realizado. Verifique seu email para confirmar.'}), 200

    except KeyError:
        return jsonify({'message': 'Dados insuficientes.'}), 400
    except EmailNotValidError as e:
        return jsonify({'message': str(e)}), 400


@app.route('/confirmar', methods=['POST'])
def confirmar():
    data = request.json
    email = data['email']
    codigo = data['codigo']

    cliente = Cliente.query.filter_by(email=email, codigo_confirmacao=codigo).first()

    if cliente:
        cliente.codigo_confirmacao = None  # Código confirmado
        db.session.commit()
        return jsonify({'message': 'Email confirmado. Agora você pode criar uma senha.'}), 200
    else:
        return jsonify({'message': 'Código de confirmação inválido.'}), 400


@app.route('/criar_senha', methods=['POST'])
def criar_senha():
    data = request.json
    email = data['email']
    senha = data['senha']

    cliente = Cliente.query.filter_by(email=email).first()

    if cliente and cliente.codigo_confirmacao is None:
        cliente.senha = senha
        db.session.commit()
        return jsonify({'message': 'Senha criada com sucesso.'}), 200
    else:
        return jsonify({'message': 'Operação inválida. Confirme o email primeiro.'}), 400


def enviar_email_confirmacao(email, codigo_confirmacao):
    sender_email = "seuemail@gmail.com"
    sender_password = "suasenha"
    receiver_email = email
    subject = "Confirme seu cadastro"
    body = f"Seu código de confirmação é: {codigo_confirmacao}"

    message = f"""\
Subject: {subject}
To: {receiver_email}
From: {sender_email}

{body}
"""

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, receiver_email, message)


if __name__ == '__main__':
    app.run(debug=True)